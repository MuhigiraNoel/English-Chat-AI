// =====================================
// CHECK ADMIN ACCESS
// =====================================

async function checkAdmin() {

    try {

        const response = await fetch("/admin/check");
        const result = await response.json();

        if (!result.success) {

            alert("Access denied!");

            window.location.href = "index.html";

            return false;
        }

        return true;

    } catch (err) {

        console.error(err);

        window.location.href = "index.html";

        return false;
    }
}


// =====================================
// LOAD STATISTICS
// =====================================

async function loadStats() {

    try {

        const response = await fetch("/admin/stats");
        const data = await response.json();

        if (!data.success) {
            return;
        }

        document.getElementById("users").textContent = data.totalUsers;
        document.getElementById("rooms").textContent = data.totalRooms;

    } catch (err) {

        console.error(err);

    }

}


// =====================================
// LOAD ALL USERS
// =====================================

async function loadUsers() {

    try {

        const response = await fetch("/admin/users");
        const data = await response.json();

        if (!data.success) {

            alert("Failed to load users.");

            return;
        }

        const usersBody = document.getElementById("usersBody");

        usersBody.innerHTML = "";

        data.users.forEach(user => {

            usersBody.innerHTML += `
                <tr>

                    <td>${user.id}</td>

                    <td>${user.fullname}</td>

                    <td>${user.username}</td>

                    <td>${user.email}</td>

                    <td>${user.role}</td>

                    <td class="actions">

                        <button class="editBtn">
                            ✏️ Edit
                        </button>

                        <button
                            class="blockBtn"
                            onclick="toggleBlock(this, ${user.id}, '${user.username}')">

                            ${user.blocked
                                ? "✅ Unblock"
                                : "🚫 Block"}

                        </button>

                        <button
                            class="deleteBtn"
                            onclick="deleteUser(${user.id}, '${user.username}')">

                            🗑 Delete

                        </button>

                    </td>

                </tr>
            `;

        });

    } catch (err) {

        console.error(err);

    }

}


// =====================================
// DELETE USER
// =====================================

async function deleteUser(id, username) {

    const ok = confirm(
        `Are you sure you want to delete ${username}?`
    );

    if (!ok) {
        return;
    }

    try {

        const response = await fetch(`/admin/users/${id}`, {
            method: "DELETE"
        });

        const result = await response.json();

        if (result.success) {

            alert("User deleted successfully.");

            loadUsers();

        } else {

            alert(result.message || "Delete failed.");

        }

    } catch (err) {

        console.error(err);

    }

}


// =====================================
// BLOCK / UNBLOCK USER
// =====================================

async function toggleBlock(button, id, username) {

    const action = button.textContent.includes("Unblock")
        ? "unblock"
        : "block";

    if (!confirm(`Are you sure you want to ${action} ${username}?`)) {
        return;
    }

    try {

        const response = await fetch(`/admin/users/${id}/block`, {
            method: "PUT"
        });

        const result = await response.json();

        if (result.success) {

            alert(
                result.blocked
                    ? "User blocked successfully."
                    : "User unblocked successfully."
            );

            loadUsers();

        } else {

            alert(result.message || "Operation failed.");

        }

    } catch (err) {

        console.error(err);

    }

}


// =====================================
// SAVE ANNOUNCEMENT
// =====================================

const saveAnnouncementBtn =
    document.getElementById("saveAnnouncement");

if (saveAnnouncementBtn) {

    saveAnnouncementBtn.addEventListener("click", async () => {

        const message = document
            .getElementById("announcement")
            .value
            .trim();

        if (message === "") {

            alert("Please enter an announcement.");

            return;
        }

        try {

            const response = await fetch("/admin/announcement", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    message
                })

            });

            const result = await response.json();

            if (result.success) {

                alert("Announcement saved successfully.");

            } else {

                alert("Failed to save announcement.");

            }

        } catch (err) {

            console.error(err);

            alert("Failed to save announcement.");

        }

    });

}


// =====================================
// SAVE WEBSITE SETTINGS
// =====================================

const saveSettingsBtn =
    document.getElementById("saveSettings");

if (saveSettingsBtn) {

    saveSettingsBtn.addEventListener("click", async () => {

        const websiteName =
            document.getElementById("websiteName").value;

        const homepageTitle =
            document.getElementById("homepageTitle").value;

        const contactEmail =
            document.getElementById("contactEmail").value;

        const maintenanceMode =
            document.getElementById("maintenanceMode").checked;

        try {

            const response = await fetch("/admin/settings", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    websiteName,
                    homepageTitle,
                    contactEmail,
                    maintenanceMode
                })

            });

            const result = await response.json();

            if (result.success) {

                alert("Settings saved successfully.");

            } else {

                alert("Failed to save settings.");

            }

        } catch (err) {

            console.error(err);

            alert("Failed to save settings.");

        }

    });

}


// =====================================
// START ADMIN DASHBOARD
// =====================================


    loadStats();

    loadUsers();

});