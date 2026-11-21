# wRENcHIRIANs — ISAT U Campus Maintenance & Issue Reporting (Track 3)

An interactive campus maintenance issue reporting and dispatch management system built for **Iloilo Science and Technology University (ISAT U) Main Campus**.

---

## 🚀 Key Features

1. **Anonymous Student Reporting Portal (`index.html`)**:
   - Zero login required — reporters remain anonymous.
   - Interactive 2D Blueprint Campus Map with clickable building hotspots.
   - Pinpoints exact location and auto-fills coordinates.
   - **Required photo upload** to ensure issue validity and prevent fake reports.

2. **Maintenance Dispatch Dashboard (`dashboard.html`)**:
   - Protected by a dedicated GSO Maintenance login gate.
     - **Username**: `maintenance`
     - **Password**: `isatumaintenance404`
   - Real-time ticket statistics bar (Total, Reported, In Progress, Resolved, Urgent).
   - Filter tickets by status (🔴 Reported, 🟡 In Progress, 🟢 Resolved) or technician role.
   - Synchronized 2D blueprint map showing live issue pins with urgency beacons.
   - Modal to claim tickets (with technician name) and one-click ticket resolution.

3. **Intelligent Backend API (`api.php`)**:
   - **Procedural PHP & MySQLi** (beginner-friendly, no complex OOP frameworks).
   - **Haversine Spatial Duplicate Detection**: Automatically merges duplicate reports within 20 meters, incrementing report counts and priority scores.
   - **Urgency Scoring**: Detects danger keywords (`spark`, `fire`, `flood`, `leak`, `no power`, `server`, `crack`, `collapse`, `hazard`) to boost ticket priority (+5).
   - **Auto-Routing**: Automatically assigns tickets based on category:
     - `IT / PC & Network` → MIS Technician
     - `Electrical` → Electrician
     - `Plumbing` → Plumber
     - `Aircon / HVAC` → HVAC Tech
     - `Furniture / Civil` → General Maintenance
   - **Atomic Claiming**: Uses atomic SQL updates to prevent two technicians from claiming the same ticket simultaneously.

---

## 📁 Project Structure

```text
vbcoders/
├── assets/
│   ├── campus-map.jpg           # Authentic ISAT U 2D Campus Blueprint (841x1024)
│   └── wrenchirians-logo.png    # Official wRENcHIRIANs project logo
├── uploads/
│   └── .htaccess                # Security policy preventing script execution in uploads
├── api.php                      # REST API endpoints (create, claim, resolve, batch, login)
├── db.php                       # Database connection using procedural mysqli
├── database.sql                 # MySQL schema and initial sample tickets
├── index.html                   # Anonymous Student Reporting Portal
├── student-portal.js            # Student form and submission logic
├── student-portal.css           # Student portal layout styling
├── dashboard.html               # Protected Maintenance Dispatch Dashboard
├── dashboard.js                 # Dashboard controller, login gate, claim & resolve
├── dashboard.css                # Dashboard layout and login card styling
├── campus-map-2d.js             # Reusable interactive 2D blueprint map engine
├── campus-map-2d.css            # 2D blueprint styling, pins, popups, and zoom controls
├── style.css                    # Base typography and form controls
└── README.md                    # Project documentation
```

---

## 🛠️ Local Setup Instructions

1. Start **Apache** and **MySQL** in the XAMPP Control Panel.
2. Import `database.sql` into MySQL (creates the `isatu_maintenance` database and sample tickets).
3. Place files in `xampp/htdocs/vbcoders`.
4. Access via browser:
   - **Student Portal**: [http://localhost/vbcoders/index.html](http://localhost/vbcoders/index.html)
   - **Maintenance Dashboard**: [http://localhost/vbcoders/dashboard.html](http://localhost/vbcoders/dashboard.html)
   - **Backend API**: [http://localhost/vbcoders/api.php](http://localhost/vbcoders/api.php)
