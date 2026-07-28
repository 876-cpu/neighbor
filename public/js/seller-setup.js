document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg');
  try {
    await api('/auth/setup-seller', {
      method: 'POST',
      body: {
        setupToken: document.getElementById('setupToken').value,
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
      },
    });
    showMessage(msg, 'Seller account created! Redirecting…', false);
    setTimeout(() => (location.href = '/seller.html'), 900);
  } catch (err) {
    showMessage(msg, err.message);
  }
});
