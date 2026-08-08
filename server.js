// ===========s - Part 1
// =====================================
require("dotenv").config();
// Load packages
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
// Create Express app
const app = express();

const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server);
let onlineUsers = 0;
// Dynamic rooms
let rooms = [];
// Port
const PORT = process.env.PORT || 3000;
// =========================
// SQLite Database
// =========================

const db = new sqlite3.Database(process.env.DB_FILE || "users.db", (err) => {

    if (err) {
        console.log("Database Error:", err.message);
    } else {
        console.log("Connected to SQLite database.");
    }

});

// Create users table
db.run(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullname TEXT,
    email TEXT,
    username TEXT,
    password TEXT,
    profilePicture TEXT,
    role TEXT DEFAULT 'user'
)
`);

db.run(`
ALTER TABLE users
ADD COLUMN role TEXT DEFAULT 'user'
`, (err) => {
    if (err && !err.message.includes("duplicate column")) {
        console.error(err.message);
    }
});
db.run(`
ALTER TABLE users
ADD COLUMN blocked INTEGER DEFAULT 0
`, (err) => {
    // Ignore error if the column already exists
});
// Give your account admin permission


// Create rooms table
// =========================
// SETTINGS TABLE
// =========================
db.run(`
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    websiteName TEXT,
    homepageTitle TEXT,
    contactEmail TEXT,
    maintenanceMode INTEGER DEFAULT 0
)
`, (err) => {

    if (err) {
        console.error(err.message);
        return;
    }

    db.run(`
    INSERT OR IGNORE INTO settings
    (id, websiteName, homepageTitle, contactEmail, maintenanceMode)
    VALUES
    (
        1,
        'SpeakUp Global',
        'Practice English with people worldwide',
        'support@speakupglobal.com',
        0
    )
    `);

});
// Serve files from the public folder
// Configure file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "data/uploads/");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });
app.use(express.urlencoded({ extended: true }));
app.use(session({
    store: new SQLiteStore({
        db: db
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    }
}));

app.use(express.json());
app.use("/uploads", express.static("data/uploads"));
// ===============================
// Get all rooms
// ===============================

app.get("/rooms", (req, res) => {

    db.all(

        "SELECT * FROM rooms ORDER BY id DESC",

        [],

        (err, rows) => {

            if (err) {

                console.log(err.message);

                return res.json([]);

            }

            res.json(rows);

        }

    );

});
// =========================
// ADMIN DASHBOARD PROTECTION
// =========================

app.get("/admin", (req, res) => {

    if (!req.session.user) {
        return res.redirect("/login.html");
    }

    if (req.session.user.role !== "admin") {
        return res.status(403).send("Access Denied");
    }

    res.sendFile(path.join(__dirname, "public", "admin.html"));
});


// Protect direct access to /admin.html
app.get("/admin.html", (req, res) => {

    if (!req.session.user) {
        return res.redirect("/login.html");
    }

    if (req.session.user.role !== "admin") {
        return res.status(403).send("Access Denied");
    }

    res.sendFile(path.join(__dirname, "public", "admin.html"));
});


// Serve the rest of the public files
app.use(express.static("public"));


// =========================
// GET WEBSITE SETTINGS
// =========================
app.get("/admin/settings", (req, res) => {

    if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).json({ success: false });
    }

    db.get(
        "SELECT * FROM settings WHERE id = 1",
        [],
        (err, row) => {

            if (err) {
                return res.json({ success: false });
            }

            res.json({
                success: true,
                settings: row
            });

        }
    );

});


// =========================
// SAVE WEBSITE SETTINGS
// =========================
app.post("/admin/settings", (req, res) => {

    if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).json({ success: false });
    }

    const {
        websiteName,
        homepageTitle,
        contactEmail,
        maintenanceMode
    } = req.body;

    db.run(
        `UPDATE settings
         SET websiteName = ?,
             homepageTitle = ?,
             contactEmail = ?,
             maintenanceMode = ?
         WHERE id = 1`,
        [
            websiteName,
            homepageTitle,
            contactEmail,
            maintenanceMode ? 1 : 0
        ],
        function(err) {

            if (err) {
                return res.json({ success: false });
            }

            res.json({ success: true });

        }
    );

});


// =========================
// SAVE ANNOUNCEMENT
// =========================
app.post("/admin/announcement", (req, res) => {

    if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).json({
            success: false
        });
    }

    const { message } = req.body;

    db.run(
        "DELETE FROM announcements",
        [],
        function(err) {

            if (err) {
                return res.json({ success: false });
            }

            db.run(
                "INSERT INTO announcements (message) VALUES (?)",
                [message],
                function(err) {

                    if (err) {
                        return res.json({ success: false });
                    }

                    res.json({
                        success: true
                    });

                }
            );

        }
    );

});

// =========================
// DELETE USER (ADMIN)
// =========================
app.delete("/admin/users/:id", (req, res) => {

    // Check if the logged-in user is an admin
    if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).json({
            success: false
        });
    }

    const userId = req.params.id;

    // Prevent an admin from deleting their own account
    if (req.session.user.id == userId) {
        return res.json({
            success: false,
            message: "You cannot delete your own admin account."
        });
// =========================
// BLOCK / UNBLOCK USER
// =========================
app.put("/admin/users/:id/block", (req, res) => {

    // Only admins can block users
    if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).json({
            success: false
        });
    }

    const userId = req.params.id;

    // Prevent admin from blocking themselves
    if (req.session.user.id == userId) {
        return res.json({
            success: false,
            message: "You cannot block your own admin account."
        });
    }

    // Get current blocked status
    db.get(
        "SELECT blocked FROM users WHERE id = ?",
        [userId],
        (err, user) => {

            if (err || !user) {
                return res.json({
                    success: false
                });
            }

            // Toggle blocked status
            const newStatus = user.blocked ? 0 : 1;

            db.run(
                "UPDATE users SET blocked = ? WHERE id = ?",
                [newStatus, userId],
                function(err) {

                    if (err) {
                        return res.json({
                            success: false
                        });
                    }

                    res.json({
                        success: true,
                        blocked: newStatus
                    });

                }
            );

        }
    );

});
    }

    db.run(
        "DELETE FROM users WHERE id = ?",
        [userId],
        function(err) {

            if (err) {
                return res.json({
                    success: false
                });
            }

            res.json({
                success: true
            });

        }
    );

});

// =========================
// ADMIN STATISTICS
// =========================
app.get("/admin/stats", (req, res) => {

    if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).json({
            success: false
        });
    }

    db.get(
        "SELECT COUNT(*) AS totalUsers FROM users",
        [],
        (err, userResult) => {

            if (err) {
                return res.json({
                    success: false
                });
            }

            db.get(
                "SELECT COUNT(*) AS totalRooms FROM rooms",
                [],
                (err, roomResult) => {

                    if (err) {
                        return res.json({
                            success: false
                        });
                    }

                    res.json({
                        success: true,
                        totalUsers: userResult.totalUsers,
                        totalRooms: roomResult.totalRooms
                    });

                }
            );

        }
    );

});
// =========================
// GET ALL USERS (ADMIN)
// =========================
app.get("/admin/users", (req, res) => {

    // Allow only admins
    if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).json({
            success: false
        });
    }

    // Get all users from the database
    db.all(
        `SELECT id, fullname, username, email, role, blocked
FROM users
         ORDER BY id DESC`,
        [],
        (err, rows) => {

            if (err) {
                return res.json({
                    success: false
                });
            }

            res.json({
                success: true,
                users: rows
            });

        }
    );

});
// Store users in rooms
const roomUsers = {};// =====================================
// New client connects
// =====================================
app.post("/upload-profile", upload.single("profilePicture"), (req, res) => {

    console.log("===== NEW USER =====");

    console.log("Full Name:", req.body.fullname);
    console.log("Email:", req.body.email);
    console.log("Username:", req.body.username);
   
    if (req.file) {
        console.log("Profile Picture:", req.file.filename);
    }
  const sql = `
INSERT INTO users
(fullname, email, username, password, profilePicture)
VALUES (?, ?, ?, ?, ?)
`;
bcrypt.hash(req.body.password, 10, (err, hashedPassword) => {

    if (err) {
        console.log("Hash Error:", err.message);

        return res.json({
            success: false
        });
    }

    db.run(
        sql,
        [
            req.body.fullname,
            req.body.email,
            req.body.username,
            hashedPassword,
            req.file ? req.file.filename : "default.png"
        ],
        function(err) {

            if (err) {
                console.log("Database Error:", err.message);

                return res.json({
                    success: false
                });
            }

            console.log("User saved! ID:", this.lastID);

            res.json({
                success: true
            });

        }
    );

});
});

app.post("/login", (req, res) => {

    console.log(req.body);

    const { username, password } = req.body;

    const sql = `
        SELECT * FROM users
        WHERE username = ?
    `;

    db.get(sql, [username], (err, user) => {

        // Database error
        if (err) {
            console.log("Login database error:", err.message);

            return res.json({
                success: false
            });
        }

        // User does not exist
        if (!user) {
            return res.json({
                success: false
            });
        }

        // Check password
        bcrypt.compare(password, user.password, (err, result) => {

            // Password checking error
            if (err) {
                console.log("Password error:", err.message);

                return res.json({
                    success: false
                });
            }

            // Wrong password
            if (!result) {
                return res.json({
                    success: false
                });
            }

            // Login successful
            req.session.user = {
                id: user.id,
                username: user.username,
                fullname: user.fullname,
                profilePicture: user.profilePicture,
                role: user.role
            };

            console.log("Login successful:", username);
            console.log("User role:", user.role);

            return res.json({
                success: true,
                username: user.username,
                fullname: user.fullname,
                profilePicture: user.profilePicture,
                role: user.role
            });

        });

    });

});


// =========================
// CHECK ADMIN ACCESS
// =========================

app.get("/admin/check", (req, res) => {

    // No logged-in user
    if (!req.session.user) {

        return res.json({
            success: false
        });

    }

    // Logged-in user is not an admin
    if (req.session.user.role !== "admin") {

        return res.json({
            success: false
        });

    }

    // User is an admin
    return res.json({
        success: true
    });

});

// ===============================
// Logout
// ===============================

// ===============================
// Check Logged In User
// ===============================

app.get("/me", (req, res) => {

    if (!req.session.user) {

        return res.json({
            loggedIn: false
        });

    }

    res.json({
        loggedIn: true,
        user: req.session.user
    });

});

// ===============================
// Logout
// ===============================

app.post("/logout", (req, res) => {

    req.session.destroy((err) => {

        if (err) {

            return res.json({
                success: false
            });

        }

        res.clearCookie("connect.sid");

        return res.json({
            success: true
        });

    });

});
io.on("connection", (socket) => {
socket.on("mute-status", (data) => {

    socket.to(data.room).emit("mute-status", data);

});
socket.on("speaking", (data) => {

    socket.to(data.room).emit("speaking", {
        username: data.username
    });

});
   onlineUsers++;

io.emit("online-users", onlineUsers);
    console.log("User connected:", socket.id);

    // Join a room
    socket.on("join-room", (data) => {

        const roomId = data.room;
const username = data.username;
const country = data.country;
const profilePicture = data.profilePicture;

        // Create room if it doesn't exist
        if (!roomUsers[roomId]) {
            roomUsers[roomId] = [];
        }
        // Check if username already exists in this room
const usernameExists = roomUsers[roomId].some(
    user => user.username.toLowerCase() === username.toLowerCase()
);

if (usernameExists) {

    socket.emit("username-taken");

    return;

}
        // Add user to room
       roomUsers[roomId].push({
    id: socket.id,
    username: username,
    country: country,
    profilePicture: profilePicture,
    owner: roomUsers[roomId].length === 0
});

        // Join Socket.IO room
        socket.join(roomId);

        // Save information on this socket
        socket.roomId = roomId;
        socket.username = username;
        socket.country = country;

        console.log(username + " joined " + roomId);

        // Notify other users
socket.to(roomId).emit("user-joined", {
    username: username
});
        // Send user list
        io.to(roomId).emit("user-list", roomUsers[roomId]);

        // Send room count
        io.to(roomId).emit("room-count", {
            room: roomId,
            count: roomUsers[roomId].length
        });

    }); 
   // ===============================
    // Chat Messages
    // ===============================

    socket.on("chat-message", (data) => {

        io.to(data.room).emit("chat-message", {
            username: data.username,
            message: data.message
        });

    });

    // ===============================
    // WebRTC Signaling
    // ===============================

    socket.on("offer", (data) => {
        socket.to(data.room).emit("offer", data);
    });

    socket.on("answer", (data) => {
        socket.to(data.room).emit("answer", data);
    });

    socket.on("ice-candidate", (data) => {
        socket.to(data.room).emit("ice-candidate", data);
    });

    // ===============================
    // User Disconnect
    // ===============================
    // ===============================
// Create Room
// ===============================

socket.on("create-room", (data) => {

    console.log("New room:", data);

    db.run(

        `INSERT INTO rooms
        (roomName, language, level, maxParticipants)
        VALUES (?, ?, ?, ?)`,

        [
            data.roomName,
            data.language,
            data.level,
            data.maxParticipants
        ],

        function(err) {

            if (err) {

                console.log("Room save error:", err.message);

                return;

            }

            console.log("Room saved to database.");

           io.emit("room-created", {
    id: this.lastID,
    roomName: data.roomName,
    language: data.language,
    level: data.level,
    maxParticipants: data.maxParticipants,
    owner: data.owner
});

        }

    );

});
// ===============================
// Kick User
// ===============================
socket.on("kick-user", (data) => {

    const roomId = socket.roomId;

    if (!roomId || !roomUsers[roomId]) return;

    // Check if the person clicking is the owner
    const owner = roomUsers[roomId].find(user => user.owner);

    if (!owner || owner.id !== socket.id) {
        return;
    }

    // Find the user to kick
    const target = roomUsers[roomId].find(
        user => user.username === data.username
    );

    if (!target) {
        return;
    }

    // Never allow kicking the owner
    if (target.owner) {
        return;
    }

    // Tell the selected user they have been kicked
    io.to(target.id).emit("kicked");

    // Disconnect that socket
    io.sockets.sockets.get(target.id)?.disconnect(true);

});
    socket.on("disconnect", () => {

        console.log("User disconnected:", socket.id);
      onlineUsers--;

if (onlineUsers < 0) {
    onlineUsers = 0;
}

io.emit("online-users", onlineUsers);
        const roomId = socket.roomId;

        if (roomId && roomUsers[roomId]) {
   // Notify users that someone left
io.to(roomId).emit("user-left", {
    username: socket.username
});
            roomUsers[roomId] = roomUsers[roomId].filter(user => user.id !== socket.id);

            io.to(roomId).emit("user-list", roomUsers[roomId]);

            io.to(roomId).emit("room-count", {
                room: roomId,
                count: roomUsers[roomId].length
            });

            if (roomUsers[roomId].length === 0) {
                delete roomUsers[roomId];
            }
        }

    });

});
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});