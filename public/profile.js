// ===========================
// Load Profile
// ===========================

window.onload = function () {

    // Username
    const username = localStorage.getItem("username") || "Guest";
    document.getElementById("profileName").textContent = username;

    // Country
    const country = localStorage.getItem("country") || "Not selected";
    document.getElementById("profileCountry").textContent = "🌍 " + country;

    // About Me
    const about = localStorage.getItem("aboutMe") || "";
    document.getElementById("aboutMe").value = about;

    // Profile Picture
    const picture = localStorage.getItem("profilePicture");

    if (picture) {
        document.getElementById("profileImage").src =
            "/uploads/" + picture;
    }

};

// ===========================
// Save Profile
// ===========================

function saveProfile() {

    localStorage.setItem(
        "aboutMe",
        document.getElementById("aboutMe").value
    );

    alert("✅ Profile saved successfully!");

}