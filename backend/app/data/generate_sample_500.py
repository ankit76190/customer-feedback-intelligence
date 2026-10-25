import csv
import random
from datetime import datetime, timedelta
from pathlib import Path

# Generates 500 realistic, diverse customer feedback entries
random.seed(42)

INDUSTRIES = {
    "SaaS B2B": {
        "products": ["CloudSync Pro", "DevOps Pipeline", "SecureVault API", "Analytics Core", "CRM Automation"],
        "channels": ["Support Ticket", "In-App Feedback", "Quarterly Review", "CSAT Survey", "Email"],
        "positives": [
            "The new pipeline orchestrator cut our deployment time from 45 minutes to 8 minutes. Our DevOps engineers are thrilled!",
            "Customer success manager Sarah went above and beyond during our SSO SAML migration. Seamless rollout for 1,200 employees.",
            "API documentation is crystal clear with working code snippets in Python, TypeScript, and Go. Best developer experience we've had.",
            "Database sync latency is virtually unnoticeable now. Real-time dashboards actually update in real-time. Phenomenal performance 🚀",
            "Role-based access control was straightforward to audit for our SOC2 Type II certification. Saved our compliance team weeks of manual work."
        ],
        "negatives": [
            "Billing auto-renewed our annual contract without the agreed 30-day prior written notice. Our procurement team is disputing this charge.",
            "System threw 504 Gateway Timeouts for over 3 hours during peak business hours yesterday. Zero proactive incident status page updates.",
            "The latest UI redesign buried the audit logs 4 levels deep in settings menus. Why break our team's daily operational muscle memory?",
            "Exporting more than 10,000 log records triggers a memory leak in the browser tab and crashes Chrome. Unacceptable for enterprise tier.",
            "Customer support response time has degraded from 15 minutes to over 24 hours since the recent acquisition. Highly disappointing."
        ],
        "neutrals": [
            "Can you clarify if the REST API supports cursor-based pagination for the /v2/events endpoint? Current docs mention both offset and cursor.",
            "The application works as advertised, but we would prefer a self-hosted on-prem option for our air-gapped government clients.",
            "Feature request: please allow custom webhook retry intervals and exponential backoff parameters in the developer console.",
            "Is there a roadmap date for official Terraform provider support? We need to automate workspace provisioning in infrastructure-as-code.",
            "Pricing per seat is reasonable, but charging for read-only executive stakeholders makes cross-department adoption difficult."
        ]
    },
    "E-Commerce Retail": {
        "products": ["Nordic Smart Thermos", "ErgoDesk Pro", "Merino Wool Hoodie", "EcoClean Dish Tabs", "Wireless NoiseCancel Headphones"],
        "channels": ["Verified Purchase Review", "Mobile App Review", "Live Chat", "Returns Portal", "Instagram DM"],
        "positives": [
            "The build quality is exceptional! Keeps my coffee boiling hot throughout my entire 10-hour hospital shift. Worth every penny ⭐⭐⭐⭐⭐",
            "Next-day delivery arrived earlier than estimated. Packaging was 100% recyclable paper with zero plastic waste. Truly impressive.",
            "The mobile app checkout via Apple Pay is so frictionless. Took less than 15 seconds from opening the notification to order confirmation.",
            "Returned an item that was slightly too large and the instant exchange arrived before I even dropped off the return parcel at UPS!",
            "Soundstage and active noise cancellation on these headphones outperform my Sony XM5s on transatlantic flights. Super comfortable ear cushions."
        ],
        "negatives": [
            "The zipper broke on day 3 of light use. Customer service told me wear-and-tear isn't covered under the 30-day warranty! Refuse to buy again.",
            "Package arrived crushed and soaking wet because the courier left it in the rain instead of on the covered porch. Product was damaged.",
            "Ordered two hoodies in charcoal black, but received two in neon orange. Returning them took 4 emails back and forth to get a return label.",
            "The sizing chart on the product page is completely misleading. An XL fits like a medium. Please standardize your garment measurements.",
            "Auto-delivery subscription charged my credit card twice for the same monthly bundle. Waiting on a refund for 12 business days now."
        ],
        "neutrals": [
            "The desk is sturdy and motors are quiet, but assembly instructions could use larger diagrams for the cable management tray screws.",
            "Decent sound quality for the price point, but the companion EQ app requires too many unnecessary location permissions.",
            "Does the warranty transfer if this was purchased as a holiday gift for a family member? Receipt doesn't specify transferability.",
            "Would appreciate an option to subscribe to deliveries every 6 weeks instead of strictly monthly or bi-monthly.",
            "Product works fine, but tracking information was stuck on 'Label Created' for 5 days before suddenly showing 'Out for Delivery'."
        ]
    },
    "FinTech & Banking": {
        "products": ["Apex Business Checking", "SmartYield Savings", "GlobalTransfer Wire", "Virtual Corporate Card", "ExpenseMatch AI"],
        "channels": ["Mobile App", "Phone Support", "In-App Ticket", "Trustpilot", "Bank Branch"],
        "positives": [
            "International wire transfer from USD to EUR settled in our supplier's Frankfurt account in under 20 minutes with zero hidden fees!",
            "Auto-reconciliation of corporate card receipts saved our bookkeeper at least 10 hours during end-of-month closing. Brilliant AI.",
            "Instant virtual card generation with customizable merchant spend limits has completely eliminated accidental SaaS subscription overruns.",
            "Security verification was smooth and respectful. Fraud alert caught an unauthorized $800 charge and reversed it immediately without hassle.",
            "Interest yield on high-yield treasury account is consistently higher than traditional commercial banks. Love the transparent daily payouts."
        ],
        "negatives": [
            "Account was frozen arbitrarily for 'routine KYC verification' with zero warning, preventing our payroll processing on Friday morning!",
            "Two-factor SMS verification code didn't arrive while I was traveling abroad, locking me out of my funds in an emergency.",
            "Statement export to QuickBooks generates malformed CSV files with inverted debit/credit columns since the last software update.",
            "Support representative could not explain a recurring $25 wire fee that does not appear on our contracted schedule of fees.",
            "Mobile check deposit failed three times in a row claiming the image was blurry despite perfect daylight and dark background."
        ],
        "neutrals": [
            "Are joint accounts supported for legal LLC partnerships with multiple designated signers? Documentation only explains sole proprietors.",
            "The mobile banking app is responsive, but searching transaction history older than 18 months requires logging into the desktop web portal.",
            "Please add an option to download official bank letters and voided check PDFs directly from the mobile app settings.",
            "Would like to set daily debit card withdrawal limits per individual cardholder rather than globally across the company account.",
            "Can you provide sandbox API keys for testing ACH batch disbursements before we activate live payments for our vendor network?"
        ]
    },
    "HealthTech & Telehealth": {
        "products": ["CareConnect Telehealth", "RxDelivery Express", "VitalsTracker Hub", "PatientPortal Plus", "MentalWellness App"],
        "channels": ["Patient Survey", "App Store Review", "Provider Feedback", "Support Center", "Web Form"],
        "positives": [
            "Consultation with Dr. Chen started precisely on time. Video quality was HD with zero buffering and my prescription was sent to CVS instantly.",
            "Being able to review blood lab results with clear reference range explanations in the mobile app reduced my health anxiety tremendously.",
            "Mental wellness guided meditation exercises and licensed therapist messaging helped me get through a difficult postpartum period.",
            "Medication refill reminders and automated home delivery ensure I never miss a dose of my heart medication. Lifesaving service ❤️",
            "The Bluetooth blood pressure monitor syncs automatically with my cardiology team's portal. Doctor adjusted my dosage remotely."
        ],
        "negatives": [
            "Waited 45 minutes in the virtual waiting room only for the appointment to be abruptly canceled with a generic 'provider unavailable' note.",
            "Prescription was sent to the wrong pharmacy branch 20 miles away despite confirming my preferred local pharmacy twice on the intake form.",
            "App crashes repeatedly when trying to upload insurance card photos on Android 14. Had to pay out-of-pocket temporarily.",
            "Billing charged me a $75 specialist copay for what was supposed to be a 100% preventive wellness exam covered under the Affordable Care Act.",
            "Video audio echoed uncontrollably during the therapy session, making it impossible to communicate effectively. Ruined the session."
        ],
        "neutrals": [
            "Can parents manage health records for multiple children under a single unified login without having to log in and out repeatedly?",
            "The provider was courteous and thorough, but the digital intake questionnaire asked for my medical history twice across different tabs.",
            "Is there an option to export vitals data (heart rate, glucose, sleep) into Apple HealthKit or Google Health Connect?",
            "Would be helpful to display the estimated wait time in the on-demand urgent care virtual queue so patients can plan accordingly.",
            "Please enable dark mode in the patient portal. Reading bright white screens late at night with a migraine is very difficult."
        ]
    }
}

OUTPUT_FILE = Path(__file__).parent / "sample_feedback_500.csv"

def generate_sample_dataset(count=500):
    rows = []
    base_date = datetime(2025, 1, 1, 8, 30, 0)
    
    for i in range(1, count + 1):
        industry_name = random.choice(list(INDUSTRIES.keys()))
        industry = INDUSTRIES[industry_name]
        
        product = random.choice(industry["products"])
        channel = random.choice(industry["channels"])
        
        # Determine sentiment and rating
        sentiment_type = random.choices(["positive", "negative", "neutral"], weights=[0.45, 0.35, 0.20])[0]
        
        if sentiment_type == "positive":
            rating = random.choice([4.0, 5.0, 5.0, 5.0])
            feedback_text = random.choice(industry["positives"])
        elif sentiment_type == "negative":
            rating = random.choice([1.0, 1.0, 2.0, 2.0, 3.0])
            feedback_text = random.choice(industry["negatives"])
        else:
            rating = random.choice([3.0, 3.0, 4.0, None])
            feedback_text = random.choice(industry["neutrals"])

        # Timestamp spread over past 60 days
        timestamp = (base_date + timedelta(days=random.randint(0, 60), hours=random.randint(0, 23), minutes=random.randint(0, 59))).strftime("%Y-%m-%d %H:%M:%S")
        
        customer_id = f"CUST-{random.randint(10000, 99999)}"
        ticket_id = f"FB-{i:04d}"

        # Inject some realistic edge cases occasionally
        if i % 45 == 0:
            # Multiline verbatim
            feedback_text = feedback_text + "\n\nAdditional notes:\n- Encountered on Chrome 124\n- OS: Windows 11 Enterprise\n- Impact: High"
        elif i % 50 == 0:
            # Unicode and emojis
            feedback_text = f"✨ Great experience overall! 👍 {feedback_text} — Verified user: Müller-Groß"
        elif i % 75 == 0:
            # Minor excess whitespace
            feedback_text = f"   {feedback_text}   "

        rows.append({
            "feedback_id": ticket_id,
            "customer_id": customer_id,
            "created_at": timestamp,
            "product_name": product,
            "rating": rating if rating is not None else "",
            "channel": channel,
            "industry": industry_name,
            "customer_feedback": feedback_text
        })

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        fieldnames = ["feedback_id", "customer_id", "created_at", "product_name", "rating", "channel", "industry", "customer_feedback"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Successfully generated {len(rows)} diverse feedback records at: {OUTPUT_FILE}")

if __name__ == "__main__":
    generate_sample_dataset(500)
