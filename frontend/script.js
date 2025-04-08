const API_URL = "http://127.0.0.1:8000";
let selectedPlateId = null;
let isStaff = false;
let countdownTimer;

const container = document.querySelector(".container");
const app = document.getElementById("app");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const logoutButton = document.getElementById("logout-button");
const platesList = document.getElementById("plates-list");
const plateDetail = document.getElementById("plate-detail");
const bidForm = document.getElementById("bid-form");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const staffSection = document.getElementById("staff-section");
const createPlateForm = document.getElementById("create-plate-form");
const staffActions = document.getElementById("staff-actions");
const updatePlateForm = document.getElementById("update-plate-form");
const deletePlateButton = document.getElementById("delete-plate-button");

function getToken() { return localStorage.getItem("token"); }
function setToken(token) { localStorage.setItem("token", token); }
function clearToken() { localStorage.removeItem("token"); }

async function apiRequest(endpoint, method = "GET", data = null) {
    const token = getToken();
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers,
        body: data ? JSON.stringify(data) : null,
    });
    if (!response.ok) throw new Error("Xato yuz berdi");
    return response.json();
}

async function getUserInfo() {
    const user = await apiRequest("/users/me");
    isStaff = user.is_staff || false;
    return user;
}

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;
    try {
        const response = await fetch(`${API_URL}/login/`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ username, password, grant_type: "password" }),
        });
        if (!response.ok) throw new Error("Login xatosi");
        const data = await response.json();
        setToken(data.access_token);
        await getUserInfo();
        container.style.display = "none";
        app.style.display = "block";
        if (isStaff) staffSection.style.display = "block";
        loadPlates();
    } catch (err) {
        document.getElementById("login-error").textContent = err.message;
    }
});

logoutButton.addEventListener("click", () => {
    if (confirm("Chiqishni xohlaysizmi?")) {
        clearToken();
        location.reload();
    }
});

async function loadPlates(query = "") {
    const url = query ? `/plates/search/?plate_number__contains=${query}` : "/plates/search/";
    const plates = await apiRequest(url);
    platesList.innerHTML = "";
    plates.forEach(plate => {
        const div = document.createElement("div");
        div.className = "card";
        div.innerHTML = `
            <h2>${plate.plate_number}</h2>
            <p>${plate.highest_bid || 0} so'm</p>
            <p>Muddati: ${new Date(plate.deadline).toLocaleDateString()}</p>
            <button class="btn" onclick="showPlateDetail(${plate.id})">Batafsil</button>
        `;
        platesList.appendChild(div);
    });
}

async function showPlateDetail(id) {
    selectedPlateId = id;
    if (countdownTimer) clearInterval(countdownTimer);
    const plate = await apiRequest(`/plates/${id}/`);
    document.getElementById("plate-title").textContent = plate.plate_number;
    document.getElementById("plate-description").textContent = plate.description || "Ta'rif yo‘q";
    document.getElementById("bids-list").innerHTML = plate.bids.map(bid => `<li>${bid.amount} so'm - ${new Date(bid.created_at).toLocaleString()}</li>`).join("");
    startCountdown(plate.deadline);
    app.querySelector("main").style.display = "none";
    plateDetail.style.display = "block";
    if (isStaff) {
        staffActions.style.display = "block";
        document.getElementById("update-plate-number").value = plate.plate_number;
        document.getElementById("update-plate-description").value = plate.description || "";
        document.getElementById("update-plate-deadline").value = new Date(plate.deadline).toISOString().slice(0, 16);
    }
}

function startCountdown(deadline) {
    const deadlineDate = new Date(deadline);
    function updateCountdown() {
        const timeLeft = deadlineDate - new Date();
        if (timeLeft <= 0) {
            document.getElementById("countdown").textContent = "Muddati tugadi";
            clearInterval(countdownTimer);
            return;
        }
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        document.getElementById("countdown").textContent = `${days}d ${hours}s ${minutes}m ${seconds}s`;
    }
    updateCountdown();
    countdownTimer = setInterval(updateCountdown, 1000);
}

bidForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const amount = e.target["bid-amount"].value;
    try {
        await apiRequest("/bids/", "POST", { amount: parseFloat(amount), plate_id: selectedPlateId });
        document.getElementById("bid-message").textContent = "Taklif qo‘yildi!";
        e.target["bid-amount"].value = "";
        showPlateDetail(selectedPlateId);
    } catch (err) {
        document.getElementById("bid-message").textContent = err.message;
    }
});

createPlateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await apiRequest("/plates/", "POST", {
        plate_number: e.target["plate-number"].value,
        description: e.target["plate-description"].value,
        deadline: e.target["plate-deadline"].value,
    });
    createPlateForm.reset();
    loadPlates();
});

updatePlateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await apiRequest(`/plates/${selectedPlateId}/`, "PUT", {
        plate_number: e.target["update-plate-number"].value,
        description: e.target["update-plate-description"].value,
        deadline: e.target["update-plate-deadline"].value,
    });
    showPlateDetail(selectedPlateId);
});

deletePlateButton.addEventListener("click", async () => {
    if (confirm("O‘chirishni xohlaysizmi?")) {
        await apiRequest(`/plates/${selectedPlateId}/`, "DELETE");
        plateDetail.style.display = "none";
        app.querySelector("main").style.display = "block";
        loadPlates();
    }
});

document.getElementById("back-to-list").addEventListener("click", () => {
    plateDetail.style.display = "none";
    app.querySelector("main").style.display = "block";
});

registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await apiRequest("/users/", "POST", {
        username: e.target.username.value,
        email: e.target.email.value,
        password: e.target.password.value,
    });
    container.querySelector(".login").style.display = "block";
    container.querySelector(".register").style.display = "none";
});

document.getElementById("show-register").addEventListener("click", () => {
    container.querySelector(".login").style.display = "none";
    container.querySelector(".register").style.display = "block";
});

document.getElementById("show-login").addEventListener("click", () => {
    container.querySelector(".login").style.display = "block";
    container.querySelector(".register").style.display = "none";
});

searchButton.addEventListener("click", () => loadPlates(searchInput.value.trim()));

if (getToken()) {
    getUserInfo().then(() => {
        container.style.display = "none";
        app.style.display = "block";
        if (isStaff) staffSection.style.display = "block";
        loadPlates();
    });
}