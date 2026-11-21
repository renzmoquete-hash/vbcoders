<?php
// ============================================================
// db.php — Database Connection File
// ISATU Campus Maintenance & Issue Reporting | Track 3
// ============================================================
// This file connects to the MySQL database using the mysqli
// library in procedural style (beginner-friendly, no PDO).
// Just include this file at the top of any PHP file that
// needs to talk to the database.
// ============================================================

// Tell PHP to throw exceptions when mysqli runs into errors
// This makes it easier to catch and handle database problems
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // --- Connect to the MySQL database ---
    // mysqli_connect(host, username, password, database_name)
    $conn = mysqli_connect("localhost", "root", "", "isatu_maintenance");

    // Set the character encoding to UTF-8 so Filipino characters
    // and special symbols are stored and read correctly
    mysqli_set_charset($conn, "utf8mb4");

    // If we get here, the connection was successful!
    // $conn is now available to any file that includes this one.

} catch (mysqli_sql_exception $e) {
    // Something went wrong while connecting (wrong password, DB not found, etc.)
    // We respond with a JSON error message so the frontend understands it
    echo json_encode([
        "success" => false,
        "error"   => "Could not connect to database"
    ]);

    // Stop everything — no point continuing without a DB connection
    exit;
}
