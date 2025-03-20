const API_URL = "http://127.0.0.1:8000";
let selectedPlateId = null;
let isStaff = false;
let countdownTimer;

const container = document.querySelector('.container');
const app = document.getElementById('app');
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const logoutButton = document.getElementById("logout-button");
const platesSection = document.querySelector(".cards");
const platesList = document.getElementById("plates-list");
const plateDetail = document.getElementById("plate-detail");
const bidForm = document.getElementById("bid-form");
const loginError = document.getElementById("login-error");
const registerError = document.getElementById("register-error");
const bidMessage = document.getElementById("bid-message");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const showLogin = document.getElementById("show-login");
const showRegister = document.getElementById("show-register");
const staffSection = document.getElementById("staff-section");
const createPlateForm = document.getElementById("create-plate-form");
const createPlateError = document.getElementById("create-plate-error");
const staffActions = document.getElementById("staff-actions");
const updatePlateForm = document.getElementById("update-plate-form");
const deletePlateButton = document.getElementById("delete-plate-button");
const staffActionError = document.getElementById("staff-action-error");
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');
const overlay = document.querySelector(".overlay");

function getToken() { return localStorage.getItem("token"); }
function setToken(token) { localStorage.setItem("token", token); }
function clearToken() { localStorage.removeItem("token"); }

async function apiRequest(endpoint, method = "GET", data = null) {
    const token = getToken();
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const response = await fetch(`${API_URL}${endpoint}`, { method, headers, body: data ? JSON.stringify(data) : null });
    if (response.status === 401) { clearToken(); location.reload(); return; }
    if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.detail || "Xato yuz berdi"); }
    return response.json();
}

async function getUserInfo() {
    try {
        const user = await apiRequest("/users/me");
        isStaff = user.is_staff || false;
        return user;
    } catch { isStaff = false; return null; }
}

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;
    try {
        const formData = new URLSearchParams({ username, password, grant_type: "password" });
        const response = await fetch(`${API_URL}/login/`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData,
        });
        if (!response.ok) throw new Error("Login xatosi");
        const data = await response.json();
        setToken(data.access_token);
        loginError.textContent = "";
        await getUserInfo();
        container.style.display = "none";
        app.style.display = "block";
        platesSection.style.display = "block";
        logoutButton.style.display = "block";
        if (isStaff) staffSection.style.display = "block";
        loadPlates();
    } catch (err) {
        loginError.textContent = err.message || "Foydalanuvchi nomi yoki parol xato";
    }
});

logoutButton.addEventListener("click", () => {
    if (confirm("Tizimdan chiqishni xohlaysizmi?")) {
        clearToken();
        location.reload();
    }
});

async function loadPlates(query = "") {
    try {
        const url = query ? `/plates/search/?plate_number__contains=${encodeURIComponent(query)}` : "/plates/search/";
        const plates = await apiRequest(url);
        const plateData = Array.isArray(plates) ? plates : plates.results || [];
        platesList.innerHTML = "";
        overlay.innerHTML = "";
        if (!plateData.length) {
            platesList.innerHTML = "<p class='no-results'>Hech qanday avtoraqam topilmadi.</p>";
            return;
        }
        plateData.forEach((plate, index) => {
            const div = document.createElement("div");
            div.className = "cards__card card";
            div.innerHTML = `
                <h2 class="card__heading">${plate.plate_number}</h2>
                <p class="card__price">${plate.highest_bid || 0} so'm</p>
                <ul role="list" class="card__bullets flow">
                    <li>ID: ${plate.id}</li>
                    <li>Muddati: ${new Date(plate.deadline).toLocaleDateString()}</li>
                </ul>
                <a href="#plate-${plate.id}" class="card__cta cta">Batafsil</a>
            `;
            div.querySelector(".cta").addEventListener("click", () => showPlateDetail(plate.id));
            platesList.appendChild(div);
            initOverlayCard(div, index);
        });
    } catch (err) {
        platesList.innerHTML = "<p class='error-message'>Ma'lumotlarni yuklashda xato yuz berdi.</p>";
    }
}

const applyOverlayMask = (e) => {
    const x = e.pageX - platesSection.offsetLeft;
    const y = e.pageY - platesSection.offsetTop;
    overlay.style = `--opacity: 1; --x: ${x}px; --y:${y}px;`;
};

const createOverlayCta = (overlayCard, ctaEl) => {
    const overlayCta = document.createElement("div");
    overlayCta.classList.add("cta");
    overlayCta.textContent = ctaEl.textContent;
    overlayCta.setAttribute("aria-hidden", true);
    overlayCard.append(overlayCta);
};

const observer = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
        const cardIndex = Array.from(document.querySelectorAll(".card")).indexOf(entry.target);
        let width = entry.borderBoxSize[0].inlineSize;
        let height = entry.borderBoxSize[0].blockSize;
        if (cardIndex >= 0) {
            overlay.children[cardIndex].style.width = `${width}px`;
            overlay.children[cardIndex].style.height = `${height}px`;
        }
    });
});

const initOverlayCard = (cardEl, index) => {
    const overlayCard = document.createElement("div");
    overlayCard.classList.add("card");
    createOverlayCta(overlayCard, cardEl.lastElementChild);
    overlay.appendChild(overlayCard);
    observer.observe(cardEl);
    overlayCard.style.backgroundColor = `hsla(${index * 100}, 82%, 51%, 0.15)`;
    overlayCard.style.borderColor = `hsla(${index * 100}, 100%, 48%, 1)`;
};

searchButton.addEventListener("click", () => loadPlates(searchInput.value.trim()));
document.body.addEventListener("pointermove", applyOverlayMask);

async function showPlateDetail(id) {
    selectedPlateId = id;
    if (countdownTimer) clearInterval(countdownTimer);
    try {
        const plate = await apiRequest(`/plates/${id}/`);
        document.getElementById("plate-title").textContent = plate.plate_number;
        document.getElementById("plate-description").textContent = plate.description || "Ta'rif mavjud emas";
        startCountdown(plate.deadline);
        const bidsList = document.getElementById("bids-list");
        bidsList.innerHTML = plate.bids.map(bid => `<li>${bid.amount} so'm - Foydalanuvchi: ${bid.user_id} - ${new Date(bid.created_at).toLocaleString()}</li>`).join('');
        platesSection.style.display = "none";
        plateDetail.style.display = "block";
        if (isStaff) {
            staffActions.style.display = "block";
            document.getElementById("update-plate-number").value = plate.plate_number;
            document.getElementById("update-plate-description").value = plate.description || "";
            document.getElementById("update-plate-deadline").value = new Date(plate.deadline).toISOString().slice(0, 16);
        } else {
            staffActions.style.display = "none";
        }
        bidMessage.textContent = "";
    } catch (err) {
        console.error(err);
    }
}

function startCountdown(deadline) {
    const deadlineDate = new Date(deadline);
    function updateCountdown() {
        const timeLeft = deadlineDate - new Date();
        if (timeLeft <= 0) {
            document.getElementById("countdown").innerHTML = "<h2>Muddati tugadi</h2>";
            clearInterval(countdownTimer);
            return;
        }
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        document.getElementById("days").textContent = String(days).padStart(2, '0');
        document.getElementById("hours").textContent = String(hours).padStart(2, '0');
        document.getElementById("minutes").textContent = String(minutes).padStart(2, '0');
        document.getElementById("seconds").textContent = String(seconds).padStart(2, '0');
    }
    updateCountdown();
    countdownTimer = setInterval(updateCountdown, 1000);
}

bidForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!getToken()) return bidMessage.textContent = "Iltimos, avval tizimga kiring!";
    const amount = e.target["bid-amount"].value;
    if (!amount || amount <= 0) return bidMessage.textContent = "Iltimos, haqiqiy miqdor kiriting!";
    try {
        await apiRequest("/bids/", "POST", { amount: parseFloat(amount), plate_id: selectedPlateId });
        bidMessage.textContent = "Taklif muvaffaqiyatli qo‘yildi!";
        bidMessage.className = "success";
        e.target["bid-amount"].value = "";
        showPlateDetail(selectedPlateId);
    } catch (err) {
        bidMessage.textContent = err.message || "Taklif qo‘yishda xato";
        bidMessage.className = "error";
    }
});

createPlateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isStaff) return createPlateError.textContent = "Sizda bu amalni bajarish huquqi yo‘q!";
    try {
        await apiRequest("/plates/", "POST", {
            plate_number: e.target["plate-number"].value,
            description: e.target["plate-description"].value,
            deadline: e.target["plate-deadline"].value,
        });
        createPlateError.textContent = "Avtoraqam muvaffaqiyatli qo‘shildi!";
        createPlateForm.reset();
        loadPlates();
    } catch (err) {
        createPlateError.textContent = err.message || "Avtoraqam qo‘shishda xato";
    }
});

updatePlateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isStaff) return staffActionError.textContent = "Sizda bu amalni bajarish huquqi yo‘q!";
    try {
        await apiRequest(`/plates/${selectedPlateId}/`, "PUT", {
            plate_number: e.target["update-plate-number"].value,
            description: e.target["update-plate-description"].value,
            deadline: e.target["update-plate-deadline"].value,
        });
        showPlateDetail(selectedPlateId);
    } catch (err) {
        staffActionError.textContent = err.message || "Avtoraqam yangilashda xato";
    }
});

deletePlateButton.addEventListener("click", async () => {
    if (!isStaff || !confirm("Avtoraqamni o‘chirishni xohlaysizmi?")) return;
    try {
        await apiRequest(`/plates/${selectedPlateId}/`, "DELETE");
        plateDetail.style.display = "none";
        platesSection.style.display = "block";
        loadPlates();
    } catch (err) {
        staffActionError.textContent = err.message || "Avtoraqam o‘chirishda xato";
    }
});

document.getElementById("back-to-list").addEventListener("click", () => {
    plateDetail.style.display = "none";
    platesSection.style.display = "block";
    loadPlates();
});

registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const email = e.target.email.value;
    const password = e.target.password.value;
    try {
        await apiRequest("/users/", "POST", { username, email, password });
        registerError.textContent = "Ro‘yxatdan o‘tish muvaffaqiyatli!";
        registerError.className = "success";
        setTimeout(() => container.classList.remove('active'), 2000);
    } catch (err) {
        registerError.textContent = err.message || "Ro‘yxatdan o‘tishda xatolik!";
        registerError.className = "error";
    }
});

registerBtn.addEventListener('click', () => container.classList.add('active'));
loginBtn.addEventListener('click', () => container.classList.remove('active'));
showRegister.addEventListener('click', () => container.classList.add('active'));
showLogin.addEventListener('click', () => container.classList.remove('active'));

(async function initApp() {
    if (getToken()) {
        await getUserInfo();
        container.style.display = "none";
        app.style.display = "block";
        platesSection.style.display = "block";
        logoutButton.style.display = "block";
        if (isStaff) staffSection.style.display = "block";
        loadPlates();
    }
})();