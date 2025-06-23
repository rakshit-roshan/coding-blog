fetch('https://your-backend-url.onrender.com/api/posts')
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById('posts');
    data.forEach(post => {
      const div = document.createElement('div');
      div.innerHTML = `<h2><a href="post.html?id=${post.id}">${post.title}</a></h2>`;
      container.appendChild(div);
    });
  });
