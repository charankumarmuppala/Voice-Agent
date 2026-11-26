import os
import json
from typing import List, Tuple

from sentence_transformers import SentenceTransformer
import faiss
from sqlalchemy.orm import Session
from app.models import Property
from app.database import SessionLocal

# Global model and index – initialized lazily
_model: SentenceTransformer | None = None
_faiss_index: faiss.IndexFlatIP | None = None
_property_ids: List[int] = []  # parallel list of DB IDs for lookup

def _load_model() -> SentenceTransformer:
    global _model
    if _model is None:
        # multilingual MiniLM model works well for English, Hindi, Kannada
        _model = SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
    return _model

def _build_index(db: Session) -> None:
    global _faiss_index, _property_ids
    model = _load_model()
    # Load all properties from DB
    props = db.query(Property).all()
    if not props:
        _faiss_index = None
        _property_ids = []
        return
    # Prepare texts for embedding – combine key fields
    texts = [f"{p.name} {p.location} {p.property_type} {p.bhk} BHK {p.price} {p.description}" for p in props]
    embeddings = model.encode(texts, normalize_embeddings=True)
    dim = embeddings.shape[1]
    _faiss_index = faiss.IndexFlatIP(dim)  # inner product on normalized vectors == cosine similarity
    _faiss_index.add(embeddings)
    _property_ids = [p.id for p in props]

def get_faiss_index() -> Tuple[faiss.IndexFlatIP | None, List[int]]:
    """Return the FAISS index and parallel list of property DB IDs. Initialise on first call.
    """
    global _faiss_index, _property_ids
    if _faiss_index is None:
        db = SessionLocal()
        try:
            _build_index(db)
        finally:
            db.close()
    return _faiss_index, _property_ids

def embed_query(text: str):
    model = _load_model()
    vec = model.encode([text], normalize_embeddings=True)
    return vec

def hybrid_search(
    query: str,
    location: str | None = None,
    max_budget: float | None = None,
    bhk: int | None = None,
    availability: str = "Ready to Move",
    top_k: int = 3,
) -> List[Property]:
    """Perform a hybrid semantic + strict filter search.
    Returns a list of Property ORM objects ordered by relevance.
    """
    db = SessionLocal()
    try:
        # Apply strict SQLite filters first to reduce candidate set
        q = db.query(Property)
        if location:
            q = q.filter(Property.location.ilike(f"%{location}%"))
        if max_budget:
            q = q.filter(Property.price <= max_budget)
        if bhk:
            q = q.filter(Property.bhk == bhk)
        if availability:
            q = q.filter(Property.availability == availability)
        candidates = q.all()
        if not candidates:
            return []
        # If we have enough candidates, we still run semantic ranking
        # Build temporary embeddings for candidates
        model = _load_model()
        cand_texts = [f"{p.name} {p.location} {p.property_type} {p.bhk} BHK {p.price} {p.description}" for p in candidates]
        cand_emb = model.encode(cand_texts, normalize_embeddings=True)
        query_vec = embed_query(query)
        # Cosine similarity via inner product
        scores = (cand_emb @ query_vec.T).reshape(-1)
        # Get top indices
        top_idx = scores.argsort()[::-1][:top_k]
        return [candidates[i] for i in top_idx]
    finally:
        db.close()
