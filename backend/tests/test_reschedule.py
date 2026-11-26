import datetime
import os
import sys
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure backend/ is on sys.path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.database import Base, get_db
from app.main import app
from app.models import Appointment, CallSession, Lead
from app.services.appointment_service import (
    detect_reschedule_intent,
    format_slot_human,
    handle_reschedule_turn,
    parse_date_time_components,
)
from app.services.conversation_graph import conversation_graph


class TestAppointmentRescheduling(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_db_path = os.path.join(os.path.dirname(__file__), "test_reschedule.db")
        if os.path.exists(cls.test_db_path):
            os.remove(cls.test_db_path)
        cls.engine = create_engine(
            f"sqlite:///{cls.test_db_path}",
            connect_args={"check_same_thread": False},
        )
        cls.TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        Base.metadata.create_all(bind=cls.engine)

        def override_get_db():
            db = cls.TestingSessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()
        cls.engine.dispose()
        if os.path.exists(cls.test_db_path):
            os.remove(cls.test_db_path)

    def setUp(self):
        self.db = self.TestingSessionLocal()
        self.db.query(Appointment).delete()
        self.db.query(CallSession).delete()
        self.db.query(Lead).delete()
        self.db.commit()

        self.now = datetime.datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)
        self.tomorrow = self.now.date() + datetime.timedelta(days=1)
        self.day2 = self.now.date() + datetime.timedelta(days=2)
        self.day3 = self.now.date() + datetime.timedelta(days=3)

    def tearDown(self):
        self.db.close()

    def _create_booked_session_and_appt(self, session_id="CALL-TEST01", appt_id="APT-TEST01", dt=None, phone="+91 9845099999", email="buyer@example.com"):
        slot_dt = dt or datetime.datetime.combine(self.day2, datetime.time(11, 0))
        lead = Lead(
            lead_id=f"LEAD-{appt_id}",
            name="Aarav",
            phone=phone,
            email=email,
            preferred_location="Whitefield",
            preferred_bhk=3,
            status="Visit Scheduled",
            notes=f"Session {session_id}",
        )
        self.db.add(lead)
        appt = Appointment(
            appointment_id=appt_id,
            lead_id=lead.lead_id,
            customer_name="Aarav",
            customer_phone=phone,
            customer_email=email,
            phone_confirmed=1,
            email_confirmed=1,
            email_status="Sent",
            property_name="Prestige Willow Park",
            location="Whitefield",
            date_time=slot_dt,
            status="Confirmed",
            notes=f"Booked via voice call {session_id}",
        )
        self.db.add(appt)
        session = CallSession(
            session_id=session_id,
            customer_name="Aarav",
            customer_phone=phone,
            language="English",
            status="in_progress",
            extracted_profile={
                "customer_name": "Aarav",
                "customer_phone": phone,
                "customer_email": email,
                "phone_confirmed": True,
                "email_confirmed": True,
                "location": "Whitefield",
                "bhk": 3,
                "budget": "1.5 Cr",
                "property_name": "Prestige Willow Park",
                "visit_interest": "Requested",
                "visit_slot": format_slot_human(slot_dt),
                "visit_date_iso": slot_dt.isoformat(),
                "booking_ready": True,
                "conv_state": "BOOKED",
                "appointment_id": appt_id,
                "language": "English",
            },
        )
        self.db.add(session)
        self.db.commit()
        return session, appt

    def test_01_intent_detection_and_generic_prompt(self):
        session, _ = self._create_booked_session_and_appt()
        for phrase in [
            "Can I change my appointment?",
            "I want to reschedule my visit.",
            "Can we meet tomorrow instead?",
            "Change my appointment to Friday.",
            "I want to change the scheduled time.",
        ]:
            self.assertTrue(detect_reschedule_intent(phrase, session.extracted_profile), f"Failed to detect: {phrase}")

        resp = self.client.post(f"/api/calls/{session.session_id}/message", json={"message": "Can I change my appointment?"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("When would you like to reschedule your property visit?", data["reply"])
        self.assertTrue(data["extracted_profile"].get("reschedule_active"))

    def test_02_successful_reschedule_date_and_time_no_duplicate(self):
        session, appt = self._create_booked_session_and_appt()
        target_str = f"{self.day3.isoformat()} at 4:00 PM"
        resp = self.client.post(f"/api/calls/{session.session_id}/message", json={"message": f"Reschedule my appointment to {target_str}"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("successfully rescheduled", data["reply"].lower())
        self.assertEqual(data["appointment_id"], appt.appointment_id)

        all_appts = self.db.query(Appointment).all()
        self.assertEqual(len(all_appts), 1)
        self.db.refresh(appt)
        self.assertEqual(appt.date_time, datetime.datetime.combine(self.day3, datetime.time(16, 0)))
        self.assertEqual(appt.email_status, "Pending")

    def test_03_date_only_then_time(self):
        session, appt = self._create_booked_session_and_appt()
        r1 = self.client.post(f"/api/calls/{session.session_id}/message", json={"message": "Change my appointment to tomorrow"}).json()
        self.assertIn("what time would you prefer", r1["reply"].lower())

        r2 = self.client.post(f"/api/calls/{session.session_id}/message", json={"message": "3:00 PM"}).json()
        self.assertIn("successfully rescheduled", r2["reply"].lower())
        self.db.refresh(appt)
        self.assertEqual(appt.date_time, datetime.datetime.combine(self.tomorrow, datetime.time(15, 0)))

    def test_04_time_only_then_date(self):
        session, appt = self._create_booked_session_and_appt()
        r1 = self.client.post(f"/api/calls/{session.session_id}/message", json={"message": "Change my appointment time to 2 PM"}).json()
        self.assertIn("which date", r1["reply"].lower())

        r2 = self.client.post(f"/api/calls/{session.session_id}/message", json={"message": self.day3.isoformat()}).json()
        self.assertIn("successfully rescheduled", r2["reply"].lower())
        self.db.refresh(appt)
        self.assertEqual(appt.date_time, datetime.datetime.combine(self.day3, datetime.time(14, 0)))

    def test_05_conflicting_slot_suggests_alternative_and_accepts(self):
        original_dt = datetime.datetime.combine(self.day2, datetime.time(11, 0))
        session, appt = self._create_booked_session_and_appt(dt=original_dt)

        # Another customer already booked day3 at 4:00 PM
        other_dt = datetime.datetime.combine(self.day3, datetime.time(16, 0))
        other_appt = Appointment(
            appointment_id="APT-OTHER1",
            customer_name="Priya",
            customer_phone="+91 9900011122",
            property_name="Assetz Marq",
            location="Whitefield",
            date_time=other_dt,
            status="Confirmed",
        )
        self.db.add(other_appt)
        self.db.commit()

        r1 = self.client.post(
            f"/api/calls/{session.session_id}/message",
            json={"message": f"Reschedule my visit to {self.day3.isoformat()} at 4:00 PM"},
        ).json()
        self.assertIn("already booked", r1["reply"].lower())
        self.assertIn("work for you", r1["reply"].lower())

        # Original appointment must remain unchanged
        self.db.refresh(appt)
        self.assertEqual(appt.date_time, original_dt)

        # Customer accepts suggested alternative
        r2 = self.client.post(f"/api/calls/{session.session_id}/message", json={"message": "Yes, that works"}).json()
        self.assertIn("successfully rescheduled", r2["reply"].lower())
        self.db.refresh(appt)
        self.assertNotEqual(appt.date_time, original_dt)
        self.assertNotEqual(appt.date_time, other_dt)

    def test_06_self_exclusion_from_conflict_check(self):
        original_dt = datetime.datetime.combine(self.day2, datetime.time(11, 0))
        session, appt = self._create_booked_session_and_appt(dt=original_dt)

        # Moving 30 mins later overlaps original_dt, but must succeed because it's the customer's own appointment
        r1 = self.client.post(
            f"/api/calls/{session.session_id}/message",
            json={"message": f"Move my appointment to {self.day2.isoformat()} at 11:30 AM"},
        ).json()
        self.assertIn("successfully rescheduled", r1["reply"].lower())
        self.db.refresh(appt)
        self.assertEqual(appt.date_time, datetime.datetime.combine(self.day2, datetime.time(11, 30)))

    def test_07_past_date_outside_hours_and_invalid_time(self):
        original_dt = datetime.datetime.combine(self.day2, datetime.time(11, 0))
        session, appt = self._create_booked_session_and_appt(dt=original_dt)

        # Past date
        r_past = self.client.post(f"/api/calls/{session.session_id}/message", json={"message": "Reschedule to yesterday at 11 AM"}).json()
        self.assertIn("past", r_past["reply"].lower())
        self.db.refresh(appt)
        self.assertEqual(appt.date_time, original_dt)

        # Outside business hours (10 PM)
        r_late = self.client.post(f"/api/calls/{session.session_id}/message", json={"message": f"Reschedule to {self.day3.isoformat()} at 10 PM"}).json()
        self.assertIn("9:00 am and 7:00 pm", r_late["reply"].lower())
        self.db.refresh(appt)
        self.assertEqual(appt.date_time, original_dt)

        # Invalid time (25:00)
        r_inv = self.client.post(f"/api/calls/{session.session_id}/message", json={"message": f"Reschedule to {self.day3.isoformat()} at 25:00"}).json()
        self.assertIn("valid time", r_inv["reply"].lower())
        self.db.refresh(appt)
        self.assertEqual(appt.date_time, original_dt)

    def test_08_multiple_consecutive_reschedules(self):
        session, appt = self._create_booked_session_and_appt()
        r1 = self.client.post(f"/api/calls/{session.session_id}/message", json={"message": f"Reschedule to {self.tomorrow.isoformat()} at 10:00 AM"}).json()
        self.assertIn("successfully rescheduled", r1["reply"].lower())
        self.db.refresh(appt)
        self.assertEqual(appt.date_time, datetime.datetime.combine(self.tomorrow, datetime.time(10, 0)))

        # Reschedule a second time in the same session
        r2 = self.client.post(f"/api/calls/{session.session_id}/message", json={"message": f"Actually change my appointment to {self.day3.isoformat()} at 5:00 PM"}).json()
        self.assertIn("successfully rescheduled", r2["reply"].lower())
        self.db.refresh(appt)
        self.assertEqual(appt.date_time, datetime.datetime.combine(self.day3, datetime.time(17, 0)))
        self.assertEqual(self.db.query(Appointment).count(), 1)

    def test_09_multilingual_rescheduling(self):
        session, appt = self._create_booked_session_and_appt()

        # Hindi
        r_hi = self.client.post(f"/api/calls/{session.session_id}/message", json={"message": "क्या मैं अपनी अपॉइंटमेंट का समय बदल सकता हूँ?"}).json()
        self.assertEqual(r_hi["detected_language"], "Hindi")
        self.assertIn("कब रीशेड्यूल", r_hi["reply"])

        # Telugu
        r_te = self.client.post(f"/api/calls/{session.session_id}/message", json={"message": f"నా అపాయింట్‌మెంట్ {self.day3.isoformat()} 4:00 PM కి మార్చండి"}).json()
        self.assertEqual(r_te["detected_language"], "Telugu")
        self.assertIn("రీషెడ్యూల్ చేయబడింది", r_te["reply"])

        # Kannada
        r_kn = self.client.post(f"/api/calls/{session.session_id}/message", json={"message": "ನನ್ನ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬದಲಾಯಿಸಬೇಕು"}).json()
        self.assertEqual(r_kn["detected_language"], "Kannada")
        self.assertIn("ರೀಶೆಡ್ಯೂಲ್", r_kn["reply"])

        # Tamil
        r_ta = self.client.post(f"/api/calls/{session.session_id}/message", json={"message": "என் சந்திப்பை மாற்ற வேண்டும்"}).json()
        self.assertEqual(r_ta["detected_language"], "Tamil")
        self.assertIn("மாற்ற", r_ta["reply"])

    def test_10_langgraph_reschedule_node_and_api_conflict(self):
        session, appt = self._create_booked_session_and_appt()
        prof = dict(session.extracted_profile)
        prof["session_id"] = session.session_id
        out = conversation_graph.invoke({
            "current_message": f"Reschedule my appointment to {self.day3.isoformat()} at 12:00 PM",
            "history": [],
            "profile": prof,
            "language": "English",
            "rag_properties": [],
            "is_exact_match": False,
            "reply": "",
            "next_action": "",
            "db": self.db,
        })
        self.assertEqual(out["next_action"], "RESCHEDULE_APPOINTMENT")
        self.assertIn("successfully rescheduled", out["reply"].lower())
        self.db.commit()

        # Direct POST /api/appointments conflict check (HTTP 409)
        conflict_resp = self.client.post("/api/appointments", json={
            "customer_name": "Another Buyer",
            "customer_phone": "+91 9888877777",
            "property_name": "Assetz Marq",
            "location": "Whitefield",
            "date_time": datetime.datetime.combine(self.day3, datetime.time(12, 0)).isoformat(),
        })
        self.assertEqual(conflict_resp.status_code, 409)


if __name__ == "__main__":
    unittest.main(verbosity=2)
