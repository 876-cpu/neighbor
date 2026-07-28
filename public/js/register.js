document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg');
  try {
    await api('/auth/register', {
      method: 'POST',
      body: {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
      },
    });
    showMessage(msg, 'Account created! Redirecting…', false);
    setTimeout(() => (location.href = '/'), 900);
  } catch (err) {
    showMessage(msg, err.message);
  }
});
