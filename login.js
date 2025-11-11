// Simulasi akun login
const users = [
  { username: "LiaoAlan", password: "12345" },
  { username: "Aldo", password: "admin" },
  { username: "Engineer", password: "tpm2025" },
  { username: "Jodimas", password: "106084" },
  { username: "Suzie", password: "105556" },
  { username: "Welsy", password: "102962" },
  { username: "Reisya", password: "123456" },
  { username: "Indra", password: "105591" },
  { username: "Mahyu", password: "100864" },
  { username: "Tomi", password: "105578" }
];

const form = document.getElementById("loginForm");
const message = document.getElementById("loginMessage");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    // Simpan session user dan redirect ke dashboard
    localStorage.setItem("loggedUser", username);
    window.location.href = "dashboard.html";
  } else {
    message.textContent = "Invalid username or password.";
  }
});
