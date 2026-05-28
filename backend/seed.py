from datetime import datetime, timedelta
import uuid
from app.database import SessionLocal, engine, Base
from app.auth import get_password_hash
from app import models

# Ensure all database tables exist on disk
Base.metadata.create_all(bind=engine)

def seed_database():
    db = SessionLocal()
    try:
        # Check if users already seeded
        if db.query(models.User).count() > 0:
            print("Database already seeded with default records. Skipping...")
            return

        print("Seeding database with default software QA tracking data...")

        # 1. Seed Users (with hashed passwords using standard password: "password123")
        hashed_password = get_password_hash("password123")
        
        users_data = [
            {
                "id": "u1",
                "email": "arjun.sharma@company.com",
                "name": "Arjun Sharma",
                "role": "qa_lead",
                "color": "#f59e0b",
                "initials": "AS"
            },
            {
                "id": "u2",
                "email": "priya.mehta@company.com",
                "name": "Priya Mehta",
                "role": "qa_tester",
                "color": "#10b981",
                "initials": "PM"
            },
            {
                "id": "u3",
                "email": "rohan.verma@company.com",
                "name": "Rohan Verma",
                "role": "developer",
                "color": "#3b82f6",
                "initials": "RV"
            },
            {
                "id": "u4",
                "email": "simran.kaur@company.com",
                "name": "Simran Kaur",
                "role": "developer",
                "color": "#8b5cf6",
                "initials": "SK"
            },
            {
                "id": "u5",
                "email": "admin@company.com",
                "name": "Admin User",
                "role": "admin",
                "color": "#ef4444",
                "initials": "AD"
            }
        ]

        db_users = {}
        for u in users_data:
            user = models.User(
                id=u["id"],
                email=u["email"],
                password_hash=hashed_password,
                name=u["name"],
                role=u["role"],
                color=u["color"],
                initials=u["initials"]
            )
            db.add(user)
            db_users[u["id"]] = user

        # 2. Seed Projects
        projects_data = [
            {
                "id": "p1",
                "name": "E-Commerce Web Portal",
                "description": "Next.js storefront, cart drawer, and Stripe integration",
                "key": "COMMERCE",
                "icon": "🛒"
            },
            {
                "id": "p2",
                "name": "SaaS Core API Gateway",
                "description": "OAuth routing, JWT validation, Redis clusters, and PostgreSQL billing streams",
                "key": "GATEWAY",
                "icon": "⚙️"
            },
            {
                "id": "p3",
                "name": "Mobile Client App",
                "description": "React Native customer messaging client app with offline SQLite draft caches",
                "key": "MOBILE",
                "icon": "📱"
            },
            {
                "id": "p4",
                "name": "Data Analytics Dashboard",
                "description": "Recharts charts telemetry portal with CSV/PDF exports",
                "key": "ANALYTICS",
                "icon": "📊"
            }
        ]

        db_projects = {}
        for p in projects_data:
            project = models.Project(
                id=p["id"],
                name=p["name"],
                description=p["description"],
                key=p["key"],
                icon=p["icon"],
                created_at=datetime.utcnow() - timedelta(days=30)
            )
            db.add(project)
            db_projects[p["id"]] = project

        db.commit()

        # 3. Seed illustrative IT bugs
        bugs_data = [
            {
                "id": "b1",
                "bug_id": "BUG-2026-00001",
                "title": "Stripe checkout double-click sends duplicate charges",
                "project_id": "p1",
                "reported_by": "u2",
                "assigned_to": "u3",
                "status": "assigned",
                "severity": "critical",
                "priority": "p0",
                "type": "functional",
                "environment": "production",
                "platform": "web",
                "affected_version": "v1.4.2",
                "description": "Double clicking the Pay button bypasses frontend validation. Stripe API resolves duplicate request tokens, leading to parallel charges on user accounts.",
                "steps_to_reproduce": [
                    "Add items to cart drawer and proceed to checkout",
                    "Enter valid card parameters in checkout sheet",
                    "Rapidly double-click the 'Pay Now' submit button",
                    "Inspect Stripe developer logs to confirm parallel charge events"
                ],
                "expected_result": "Frontend button disables immediately on click, preventing subsequent triggers.",
                "actual_result": "Button does not disable fast enough. Multiple click events fire parallel API requests.",
                "browser": "Chrome 125.0",
                "os": "macOS Sonoma",
                "app_version": "v1.4.2",
                "url": "/checkout/pay",
                "operator_name": "Priya Mehta",
                "device_logs": "TypeError: Unhandled promise rejection: Duplicate submit session token",
                "branch_name": "fix/checkout-double-click",
                "estimated_fix_time": "4 hours",
                "tags": ["stripe", "checkout", "regression", "payments"]
            },
            {
                "id": "b2",
                "bug_id": "BUG-2026-00002",
                "title": "Expired auth JWT refresh loop triggers node process crash",
                "project_id": "p2",
                "reported_by": "u1",
                "assigned_to": "u4",
                "status": "in_development",
                "severity": "high",
                "priority": "p1",
                "type": "performance",
                "environment": "staging",
                "platform": "linux",
                "affected_version": "v3.2.0-beta",
                "description": "When an auth token expires, the gateway refreshes credentials recursion loop. The process runs out of call stack memory, leading to gateway process crash.",
                "steps_to_reproduce": [
                    "Launch client app and acquire OAuth JWT token session",
                    "Manually expire token in Redis cache",
                    "Perform a REST request requiring claims authentication",
                    "Gateway logs display infinite recursion refreshes until crash"
                ],
                "expected_result": "Gateway handles expired tokens gracefully and redirects request to login.",
                "actual_result": "Infinite recursive lookup loop crashes node connection pools.",
                "browser": "Postman v10.2",
                "os": "Ubuntu 22.04 LTS",
                "app_version": "v3.2.0-beta",
                "url": "/api/v1/auth/refresh",
                "operator_name": "Arjun Sharma",
                "device_logs": "RangeError: Maximum call stack size exceeded\n    at TokenService.refreshSession (gateway/auth.js:143:21)",
                "branch_name": "bugfix/auth-recursion-refactor",
                "estimated_fix_time": "8 hours",
                "tags": ["auth", "redis", "gateway", "memory-leak"]
            },
            {
                "id": "b3",
                "bug_id": "BUG-2026-00003",
                "title": "App collapses due to null values unwrapping in JSON payload",
                "project_id": "p3",
                "reported_by": "u2",
                "assigned_to": None,
                "status": "new",
                "severity": "high",
                "priority": "p1",
                "type": "functional",
                "environment": "production",
                "platform": "ios",
                "affected_version": "v2.1.0",
                "description": "If push notification payload does not contain an optional badge key, Swift unwrap crashes the client dashboard process immediately on notification mount.",
                "steps_to_reproduce": [
                    "Open mobile app and keep it in background",
                    "Send notification payload without optional 'badge' metadata key",
                    "Tap notification banner to resume client app context",
                    "App terminates abruptly"
                ],
                "expected_result": "App handles missing badge keys gracefully by defaulting badge count to 0.",
                "actual_result": "App crashes due to nil unwrap in notification handler.",
                "browser": "React Native Shell",
                "os": "iOS 17.4",
                "app_version": "v2.1.0",
                "url": "/notifications",
                "operator_name": "Priya Mehta",
                "device_logs": "Fatal error: Unexpectedly found nil while unwrapping an Optional value: AppDelegate.swift, line 43",
                "branch_name": None,
                "estimated_fix_time": "2 hours",
                "tags": ["push-notifications", "nil-unwrap", "ios-crash"]
            }
        ]

        for b in bugs_data:
            bug = models.Bug(
                id=b["id"],
                bug_id=b["bug_id"],
                title=b["title"],
                project_id=b["project_id"],
                reported_by=b["reported_by"],
                assigned_to=b["assigned_to"],
                status=b["status"],
                severity=b["severity"],
                priority=b["priority"],
                type=b["type"],
                environment=b["environment"],
                platform=b["platform"],
                affected_version=b["affected_version"],
                description=b["description"],
                steps_to_reproduce=b["steps_to_reproduce"],
                expected_result=b["expected_result"],
                actual_result=b["actual_result"],
                browser=b["browser"],
                os=b["os"],
                app_version=b["app_version"],
                url=b["url"],
                operator_name=b["operator_name"],
                device_logs=b["device_logs"],
                branch_name=b["branch_name"],
                estimated_fix_time=b["estimated_fix_time"],
                tags=b["tags"],
                qa_verification={},
                created_at=datetime.utcnow() - timedelta(days=2),
                updated_at=datetime.utcnow() - timedelta(hours=4)
            )
            db.add(bug)
            
            # Seed creation history logs
            entry = models.BugHistoryEntry(
                id=str(uuid.uuid4()),
                bug_id=b["id"],
                field="status",
                old_value="",
                new_value="new",
                changed_by=b["reported_by"],
                action="created",
                description="Bug created by reporter",
                timestamp=datetime.utcnow() - timedelta(days=2)
            )
            db.add(entry)
            
            # If bug is assigned, seed assignment history
            if b["assigned_to"]:
                entry_assign = models.BugHistoryEntry(
                    id=str(uuid.uuid4()),
                    bug_id=b["id"],
                    field="assignedTo",
                    old_value="",
                    new_value=b["assigned_to"],
                    changed_by="u1", # Assigned by lead Arjun
                    action="assigned",
                    description="Bug assigned to developer",
                    timestamp=datetime.utcnow() - timedelta(days=1)
                )
                db.add(entry_assign)

        db.commit()

        # 4. Seed timeline comments
        comments_data = [
            {
                "bug_id": "b1",
                "user_id": "u3", # developer Rohan
                "text": "Confirmed the duplicate click issue. I am wrapping the checkout button component in a debouncer hook to disable subsequent clicks immediately."
            },
            {
                "bug_id": "b1",
                "user_id": "u1", # lead Arjun
                "text": "Please make sure we check parallel session logs on the gateway as well. We want to be 100% sure duplicate charges never complete even if the client-side button fails."
            },
            {
                "bug_id": "b2",
                "user_id": "u4", # developer Simran
                "text": "I am working on separating auth token refreshes from standard error interceptors. This recursion is happening because Axios refresh tries to request refresh itself if expired."
            }
        ]

        for c in comments_data:
            comment = models.Comment(
                id=str(uuid.uuid4()),
                bug_id=c["bug_id"],
                user_id=c["user_id"],
                text=c["text"],
                timestamp=datetime.utcnow() - timedelta(hours=12)
            )
            db.add(comment)

        db.commit()
        print("Database seeded successfully with default software defect records!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
