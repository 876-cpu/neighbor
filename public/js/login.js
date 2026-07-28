document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg');
  try {
    const { user } = await api('/auth/login', {
      method: 'POST',
      body: {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
      },
    });
    const params = new URLSearchParams(location.search);
    const redirect = params.get('redirect');
    if (redirect) location.href = redirect;
    else location.href = user.role === 'seller' ? '/seller.html' : '/';
  } catch (err) {
    showMessage(msg, err.message);
  }
});
