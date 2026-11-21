<?php
// ============================================================
// api.php — REST API Endpoints
// ISATU Campus Maintenance & Issue Reporting | Track 3
// ============================================================
// This file handles all API requests from the frontend (Laptop A).
// Routes are controlled via ?action=xxx in the URL.
//
// Available routes:
//   GET  api.php                 → List all tickets
//   POST api.php?action=create   → Submit a new issue
//   POST api.php?action=claim    → Technician claims a ticket
//   POST api.php?action=resolve  → Mark a ticket as resolved
//   POST api.php?action=batch    → Batch-import multiple issues
// ============================================================


// --- CORS Headers ---
// These headers allow Laptop A (a different computer/origin)
// to make requests to this API without being blocked by the browser
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

// When a browser sends an OPTIONS "preflight" request, just say OK and stop
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// --- Include Database Connection ---
// This gives us the $conn variable we need to run queries
include("db.php");


// ============================================================
// HELPER FUNCTION: Haversine Formula
// ============================================================
// Calculates the straight-line distance (in meters) between
// two GPS coordinates on the Earth's surface.
// We use this to detect if a new report is about the same issue
// as one that already exists (within 20 meters = likely duplicate).
// ============================================================
function getDistanceInMeters($lat1, $lon1, $lat2, $lon2) {
    $earthRadius = 6371000; // Earth's radius in meters

    // Convert the difference in degrees to radians
    $dLat = deg2rad($lat2 - $lat1);
    $dLon = deg2rad($lon2 - $lon1);

    // Haversine formula — standard math for distance on a sphere
    $a = sin($dLat / 2) * sin($dLat / 2)
       + cos(deg2rad($lat1)) * cos(deg2rad($lat2))
       * sin($dLon / 2) * sin($dLon / 2);

    // Return the distance in meters
    return $earthRadius * (2 * atan2(sqrt($a), sqrt(1 - $a)));
}


// ============================================================
// HELPER FUNCTION: Auto-Route Issue Type → Assigned Role
// ============================================================
// Given an issue type, this returns who should fix it.
// Uses a switch statement — clean and easy to follow.
// ============================================================
function getAssignedRole($issue_type) {
    switch ($issue_type) {
        case "IT / PC & Network": return "MIS Technician";
        case "Electrical":        return "Electrician";
        case "Plumbing":          return "Plumber";
        case "Aircon / HVAC":     return "HVAC Tech";
        case "Furniture / Civil": return "General Maintenance";
        default:                  return "General Maintenance";
    }
}


// ============================================================
// HELPER FUNCTION: Urgency / Priority Scoring
// ============================================================
// Reads the description text and checks for dangerous keywords.
// If a dangerous word is found, it adds +5 to the base score.
// ============================================================
function calcPriorityScore($description) {
    $priority = 1; // Everyone starts with a base score of 1

    // List of keywords that indicate a serious/urgent situation
    // Added safety keywords like crack, collapse, hazard for civil structural reports
    $urgentWords = ["spark", "fire", "flood", "leak", "no power", "server", "crack", "collapse", "hazard"];

    // Check if any urgent word appears in the description (case-insensitive)
    foreach ($urgentWords as $word) {
        if (stripos($description, $word) !== false) {
            $priority += 5; // Bump up the priority score
            break;          // One match is enough — stop checking
        }
    }

    return $priority;
}


// ============================================================
// HELPER FUNCTION: Generate Next Ticket Code
// ============================================================
// Looks at the last inserted ticket and creates the next code.
// Format: GSO-001, GSO-002, GSO-003, ...
// ============================================================
function generateTicketCode($conn) {
    // Find the most recently created ticket
    $result = mysqli_query($conn, "SELECT ticket_code FROM issues ORDER BY id DESC LIMIT 1");

    if (mysqli_num_rows($result) === 0) {
        // No tickets exist yet, start from GSO-001
        return "GSO-001";
    }

    $row = mysqli_fetch_assoc($result);
    $lastCode = $row["ticket_code"]; // e.g. "GSO-005"

    // Extract the number part after "GSO-" and add 1
    $lastNum = (int) substr($lastCode, 4); // 005 → 5
    $nextNum = $lastNum + 1;               // 5   → 6

    // Pad with leading zeros so it always has 3 digits (e.g. 6 → "006")
    return "GSO-" . str_pad($nextNum, 3, "0", STR_PAD_LEFT);
}


// ============================================================
// HELPER FUNCTION: Spatial Duplicate Check + Merge
// ============================================================
// DISABLED — Every report now creates its own ticket, even if
// it's in the same room or nearby. This way multiple issues
// at one location each get tracked separately.
//
// Returns: always ["found" => false] so a new ticket is created.
// ============================================================
function checkAndMergeDuplicate($conn, $issue_type, $lat, $lon) {
    // Always treat every report as a unique ticket
    return ["found" => false];
}


// ============================================================
// HELPER FUNCTION: Handle Photo Upload
// ============================================================
// Moves the uploaded photo to the uploads/ folder.
// Returns the saved file path, or NULL if no photo was sent.
// ============================================================
function handlePhotoUpload() {
    // Check if a file was actually uploaded and there were no errors
    if (!isset($_FILES["photo"]) || $_FILES["photo"]["error"] !== UPLOAD_ERR_OK) {
        return null; // No photo uploaded, that's okay
    }

    // Create a unique filename to avoid overwriting existing photos
    // We combine the current time + random number + original extension
    $ext      = pathinfo($_FILES["photo"]["name"], PATHINFO_EXTENSION);
    $filename = time() . "_" . rand(1000, 9999) . "." . strtolower($ext);
    $destPath = "uploads/" . $filename;

    // Move the temp file to our uploads folder
    if (move_uploaded_file($_FILES["photo"]["tmp_name"], $destPath)) {
        return $destPath; // Return the saved path so we can store it in the DB
    }

    return null; // Upload failed for some reason
}


// ============================================================
// READ JSON BODY (for claim, resolve, batch)
// ============================================================
// Some requests send data as JSON in the request body instead of
// regular POST fields. This reads and decodes that JSON.
// ============================================================
$jsonBody = json_decode(file_get_contents("php://input"), true);
if (!is_array($jsonBody)) {
    $jsonBody = []; // If no valid JSON, just use an empty array
}


// ============================================================
// ROUTING — Decide which action to run
// ============================================================
// We read ?action=xxx from the URL.
// If no action is given, we default to listing all tickets.
// ============================================================

$action = isset($_GET["action"]) ? $_GET["action"] : "";

// ----------------------------------------------------------------
// ROUTE 1: GET api.php or api.php?action=list — List all tickets
// ----------------------------------------------------------------
if ($_SERVER["REQUEST_METHOD"] === "GET" && ($action === "" || $action === "list")) {

    // Fetch all tickets, sorted by:
    //   1. Status (Reported first, then In Progress, then Resolved)
    //   2. Priority score (highest urgency first)
    //   3. Created date (newest first)
    $sql    = "SELECT * FROM issues
               ORDER BY FIELD(status, 'Reported', 'In Progress', 'Resolved'),
                        priority_score DESC,
                        created_at DESC";
    $result = mysqli_query($conn, $sql);

    // Build the array of tickets by looping through each row
    $tickets = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $tickets[] = $row;
    }

    // Send the tickets back to the frontend as JSON
    echo json_encode(["success" => true, "data" => $tickets]);
    exit;
}


// ----------------------------------------------------------------
// ROUTE 2: POST api.php?action=create — Submit a new issue
// ----------------------------------------------------------------
if ($_SERVER["REQUEST_METHOD"] === "POST" && $action === "create") {

    // --- Read submitted form fields ---
    $issue_type     = isset($_POST["issue_type"])     ? trim($_POST["issue_type"])     : "";
    $location_text  = isset($_POST["location_text"])  ? trim($_POST["location_text"])  : "";
    $description    = isset($_POST["description"])    ? trim($_POST["description"])    : "";
    $preferred_tech = isset($_POST["preferred_tech"]) ? trim($_POST["preferred_tech"]) : "";
    $latitude       = isset($_POST["latitude"])       ? (float) $_POST["latitude"]     : 0.0;
    $longitude      = isset($_POST["longitude"])      ? (float) $_POST["longitude"]    : 0.0;

    // --- Validation Gate ---
    // Make sure the three required fields are not empty
    if (empty($issue_type) || empty($location_text) || empty($description)) {
        echo json_encode([
            "success" => false,
            "error"   => "Please fill in all required fields."
        ]);
        exit;
    }

    // --- Photo is REQUIRED ---
    // A photo must be attached to prove the report is valid and not fake
    if (!isset($_FILES["photo"]) || $_FILES["photo"]["error"] !== UPLOAD_ERR_OK) {
        echo json_encode([
            "success" => false,
            "error"   => "A photo is required. Please attach a photo of the issue to verify your report."
        ]);
        exit;
    }

    // --- Spatial Duplicate Check ---
    // Before creating a new ticket, see if one already exists nearby
    $duplicate = checkAndMergeDuplicate($conn, $issue_type, $latitude, $longitude);

    if ($duplicate["found"] === true) {
        // A nearby ticket was found and merged — no new ticket needed
        echo json_encode([
            "success"     => true,
            "merged"      => true,
            "ticket_code" => $duplicate["ticket_code"],
            "message"     => "Duplicate issue merged within 20m!"
        ]);
        exit;
    }

    // --- Auto-Routing: Assign the right technician role ---
    $assigned_role = getAssignedRole($issue_type);

    // If the user specified a preferred technician (and it's not "All"),
    // override the default role with their preference
    if (!empty($preferred_tech) && $preferred_tech !== "All") {
        $assigned_role = $preferred_tech;
    }

    // --- Urgency / Priority Scoring ---
    $priority_score = calcPriorityScore($description);

    // --- Generate a unique ticket code ---
    $ticket_code = generateTicketCode($conn);

    // --- Handle REQUIRED photo upload ---
    $photo_path = handlePhotoUpload();

    // --- Escape all values before inserting into the database ---
    // This prevents SQL injection attacks
    $safe_ticket_code  = mysqli_real_escape_string($conn, $ticket_code);
    $safe_issue_type   = mysqli_real_escape_string($conn, $issue_type);
    $safe_location     = mysqli_real_escape_string($conn, $location_text);
    $safe_description  = mysqli_real_escape_string($conn, $description);
    $safe_photo        = $photo_path ? mysqli_real_escape_string($conn, $photo_path) : "NULL";
    $safe_role         = mysqli_real_escape_string($conn, $assigned_role);

    // Build the photo value for SQL — use NULL keyword if no photo
    $photo_sql = ($photo_path !== null) ? "'$safe_photo'" : "NULL";

    // --- Insert the new ticket into the database ---
    $sql = "INSERT INTO issues
                (ticket_code, issue_type, location_text, latitude, longitude,
                 description, photo_path, assigned_role, priority_score)
            VALUES
                ('$safe_ticket_code', '$safe_issue_type', '$safe_location',
                 $latitude, $longitude, '$safe_description',
                 $photo_sql, '$safe_role', $priority_score)";

    mysqli_query($conn, $sql);

    // --- Send back the success response ---
    echo json_encode([
        "success"        => true,
        "merged"         => false,
        "ticket_code"    => $ticket_code,
        "priority_score" => $priority_score,
        "message"        => "Ticket created!"
    ]);
    exit;
}


// ----------------------------------------------------------------
// ROUTE 3: POST api.php?action=claim — Technician claims a ticket
// ----------------------------------------------------------------
if ($_SERVER["REQUEST_METHOD"] === "POST" && $action === "claim") {

    // Accept data either from JSON body or regular POST fields
    $id            = isset($jsonBody["id"])               ? (int)   $jsonBody["id"]               : (int)   ($_POST["id"]               ?? 0);
    $tech_name     = isset($jsonBody["technician_name"])  ? trim($jsonBody["technician_name"])     : trim(   ($_POST["technician_name"]   ?? ""));

    // Make sure we have valid input
    if ($id <= 0 || empty($tech_name)) {
        echo json_encode([
            "success" => false,
            "error"   => "Invalid ticket ID or technician name."
        ]);
        exit;
    }

    // Escape the technician name before using it in SQL
    $safe_tech = mysqli_real_escape_string($conn, $tech_name);

    // --- Atomic Claim: Only claim if the ticket is still "Reported" ---
    // The WHERE clause checks both the ID AND the status at the same time.
    // This prevents two technicians from claiming the same ticket simultaneously.
    $sql = "UPDATE issues
            SET status = 'In Progress', claimed_by = '$safe_tech'
            WHERE id = $id AND status = 'Reported'";

    mysqli_query($conn, $sql);

    // Check how many rows were actually updated
    if (mysqli_affected_rows($conn) > 0) {
        // Update was successful — the ticket now belongs to this technician
        echo json_encode([
            "success" => true,
            "message" => "Ticket claimed successfully."
        ]);
    } else {
        // 0 rows updated — either the ID doesn't exist, or someone else already claimed it
        echo json_encode([
            "success" => false,
            "error"   => "Ticket was already claimed by another technician."
        ]);
    }
    exit;
}


// ----------------------------------------------------------------
// ROUTE 4: POST api.php?action=resolve — Mark a ticket as resolved
// ----------------------------------------------------------------
if ($_SERVER["REQUEST_METHOD"] === "POST" && $action === "resolve") {

    // Accept data from JSON body or regular POST
    $id = isset($jsonBody["id"]) ? (int) $jsonBody["id"] : (int) ($_POST["id"] ?? 0);

    // Make sure we have a valid ticket ID
    if ($id <= 0) {
        echo json_encode([
            "success" => false,
            "error"   => "Invalid ticket ID."
        ]);
        exit;
    }

    // --- Update the ticket status to "Resolved" ---
    mysqli_query($conn, "UPDATE issues SET status = 'Resolved' WHERE id = $id");

    // Send back a success message
    echo json_encode([
        "success" => true,
        "message" => "Ticket resolved."
    ]);
    exit;
}


// ----------------------------------------------------------------
// ROUTE 5: POST api.php?action=delete — Delete a ticket (Reported status only)
// ----------------------------------------------------------------
if ($_SERVER["REQUEST_METHOD"] === "POST" && $action === "delete") {

    // Accept data from JSON body or regular POST
    $id = isset($jsonBody["id"]) ? (int) $jsonBody["id"] : (int) ($_POST["id"] ?? 0);

    // Make sure we have a valid ticket ID
    if ($id <= 0) {
        echo json_encode([
            "success" => false,
            "error"   => "Invalid ticket ID."
        ]);
        exit;
    }

    // Check if the ticket exists and verify its status
    $checkSql = "SELECT id, status, photo_path FROM issues WHERE id = $id LIMIT 1";
    $checkRes = mysqli_query($conn, $checkSql);
    $ticket   = mysqli_fetch_assoc($checkRes);

    if (!$ticket) {
        echo json_encode([
            "success" => false,
            "error"   => "Ticket not found."
        ]);
        exit;
    }

    // Only allow deletion if the ticket is in "Reported" status
    if ($ticket["status"] !== "Reported") {
        echo json_encode([
            "success" => false,
            "error"   => "Only tickets in 'Reported' status can be deleted."
        ]);
        exit;
    }

    // Remove photo from uploads folder if it exists
    if (!empty($ticket["photo_path"]) && file_exists($ticket["photo_path"])) {
        @unlink($ticket["photo_path"]);
    }

    // Delete the ticket row from the issues table
    mysqli_query($conn, "DELETE FROM issues WHERE id = $id");

    echo json_encode([
        "success" => true,
        "message" => "Ticket deleted successfully."
    ]);
    exit;
}


// ----------------------------------------------------------------
// ROUTE 5: POST api.php?action=batch — Import multiple issues at once
// ----------------------------------------------------------------
if ($_SERVER["REQUEST_METHOD"] === "POST" && $action === "batch") {

    // Read the "rows" array from the JSON body
    $rows = isset($jsonBody["rows"]) ? $jsonBody["rows"] : [];

    // Make sure "rows" is actually an array
    if (!is_array($rows) || count($rows) === 0) {
        echo json_encode([
            "success" => false,
            "error"   => "No rows provided. Send a JSON body with a 'rows' array."
        ]);
        exit;
    }

    // --- Building Coordinates Lookup Table ---
    // These are known GPS coordinates for each ISATU building.
    // If a row's location_text matches a building name, we use these coordinates.
    $buildingCoords = [
        "admin"       => ["lat" => 10.7158, "lon" => 122.5654],
        "engineering" => ["lat" => 10.7156, "lon" => 122.5662],
        "cit"         => ["lat" => 10.7151, "lon" => 122.5664],
        "cea"         => ["lat" => 10.7149, "lon" => 122.5659],
        "education"   => ["lat" => 10.7154, "lon" => 122.5649],
        "library"     => ["lat" => 10.7161, "lon" => 122.5657],
        "ict"         => ["lat" => 10.7152, "lon" => 122.5653],
    ];

    // --- Track batch results ---
    $inserted = 0; // How many new tickets were created
    $merged   = 0; // How many duplicates were found and merged
    $rejected = 0; // How many rows had validation errors
    $errors   = []; // List of error messages for rejected rows

    // --- Loop through each submitted row ---
    foreach ($rows as $index => $row) {
        $rowNum = $index + 1; // Human-readable row number (starts at 1)

        // Read fields from this row
        $issue_type    = isset($row["issue_type"])    ? trim($row["issue_type"])    : "";
        $location_text = isset($row["location_text"]) ? trim($row["location_text"]) : "";
        $description   = isset($row["description"])   ? trim($row["description"])   : "";
        $preferred_tech = isset($row["preferred_tech"]) ? trim($row["preferred_tech"]) : "";

        // --- Validation: Reject rows missing required fields ---
        if (empty($issue_type) || empty($location_text) || empty($description)) {
            $rejected++;
            $errors[] = "Row $rowNum: Missing required fields (issue_type, location_text, or description).";
            continue; // Skip to the next row
        }

        // --- Determine GPS Coordinates ---
        // If the row has explicit lat/lon, use those.
        // Otherwise, try to match the location_text against our building lookup table.
        if (!empty($row["latitude"]) && !empty($row["longitude"])) {
            $latitude  = (float) $row["latitude"];
            $longitude = (float) $row["longitude"];
        } else {
            // Try to find the building name in our lookup table
            $matched = false;
            $locationLower = strtolower($location_text);

            foreach ($buildingCoords as $buildingKey => $coords) {
                // Check if the location text contains the building keyword
                if (stripos($locationLower, $buildingKey) !== false) {
                    $latitude  = $coords["lat"];
                    $longitude = $coords["lon"];
                    $matched   = true;
                    break;
                }
            }

            if (!$matched) {
                // Could not determine coordinates — use a default center of campus
                $latitude  = 10.7155;
                $longitude = 122.5658;
            }
        }

        // --- Spatial Duplicate Check (same logic as single-create) ---
        $duplicate = checkAndMergeDuplicate($conn, $issue_type, $latitude, $longitude);

        if ($duplicate["found"] === true) {
            // This row matches an existing nearby ticket — just merge it
            $merged++;
            continue; // Move on to the next row
        }

        // --- Auto-Routing ---
        $assigned_role = getAssignedRole($issue_type);

        // Override with preferred tech if specified
        if (!empty($preferred_tech) && $preferred_tech !== "All") {
            $assigned_role = $preferred_tech;
        }

        // --- Priority Scoring ---
        $priority_score = calcPriorityScore($description);

        // --- Generate Ticket Code ---
        $ticket_code = generateTicketCode($conn);

        // --- Escape values for SQL safety ---
        $safe_ticket_code = mysqli_real_escape_string($conn, $ticket_code);
        $safe_issue_type  = mysqli_real_escape_string($conn, $issue_type);
        $safe_location    = mysqli_real_escape_string($conn, $location_text);
        $safe_description = mysqli_real_escape_string($conn, $description);
        $safe_role        = mysqli_real_escape_string($conn, $assigned_role);

        // --- Insert this row into the database ---
        $sql = "INSERT INTO issues
                    (ticket_code, issue_type, location_text, latitude, longitude,
                     description, assigned_role, priority_score)
                VALUES
                    ('$safe_ticket_code', '$safe_issue_type', '$safe_location',
                     $latitude, $longitude, '$safe_description',
                     '$safe_role', $priority_score)";

        $queryResult = mysqli_query($conn, $sql);

        if ($queryResult) {
            $inserted++;
        } else {
            // Something went wrong with this particular insert
            $rejected++;
            $errors[] = "Row $rowNum: Database error while inserting.";
        }
    }

    // --- Return the batch summary ---
    echo json_encode([
        "success"  => true,
        "inserted" => $inserted,
        "merged"   => $merged,
        "rejected" => $rejected,
        "errors"   => $errors
    ]);
    exit;
}


// ----------------------------------------------------------------
// ROUTE 6: POST api.php?action=login — Verify maintenance credentials
// ----------------------------------------------------------------
if ($_SERVER["REQUEST_METHOD"] === "POST" && $action === "login") {

    // Read username and password from regular POST or JSON body
    $username = isset($_POST["username"]) ? trim($_POST["username"]) : (isset($jsonBody["username"]) ? trim($jsonBody["username"]) : "");
    $password = isset($_POST["password"]) ? trim($_POST["password"]) : (isset($jsonBody["password"]) ? trim($jsonBody["password"]) : "");

    // Check credentials: username = "maintenance", password = "isatumaintenance404"
    if ($username === "maintenance" && $password === "isatumaintenance404") {
        echo json_encode([
            "success" => true,
            "message" => "Login successful. Welcome to wRENcHIRIANs Maintenance Dispatch.",
            "user"    => "maintenance"
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "error"   => "Invalid username or password. Access is restricted to authorized GSO Maintenance personnel."
        ]);
    }
    exit;
}


// ----------------------------------------------------------------
// FALLBACK: Unknown or unsupported route
// ----------------------------------------------------------------
// If none of the routes matched, return a helpful error message.
echo json_encode([
    "success" => false,
    "error"   => "Unknown action. Valid actions: create, claim, resolve, batch, login, delete"
]);
