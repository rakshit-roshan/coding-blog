// Handle blog post creation
const postForm = document.getElementById('postForm');
if (postForm) {
  postForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const title = document.getElementById('title').value.trim();
    const excerpt = document.getElementById('excerpt').value.trim(); // maps to "content"
    const tags = document.getElementById('tags').value.trim().split(',').map(tag => tag.trim());
    const icon = document.getElementById('icon').value.trim();

    const postData = {
      title,
      content: excerpt,
      tags,
      icon,
      date: new Date().toISOString().split('T')[0]
    };

    try {
      const res = await fetch('https://coding-blog-g5dt.onrender.com/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });

      if (!res.ok) throw new Error('Failed to save post');

      alert('Post submitted successfully!');
      postForm.reset();
    } catch (err) {
      console.error(err);
      alert('Error submitting post.');
    }
  });
}

// Fetch and display blog posts
async function fetchAndDisplayPosts() {
  const blogGrid = document.getElementById('blogGrid');
  const loading = document.getElementById('loading');
  if (!blogGrid) return;

  try {
    const res = await fetch('https://coding-blog-g5dt.onrender.com/api/posts');
    if (!res.ok) throw new Error('Failed to fetch posts');
    const posts = await res.json();

    // Remove loading spinner
    if (loading) loading.style.display = 'none';

    if (posts.length === 0) {
      blogGrid.innerHTML = '<p>No blog posts found.</p>';
      return;
    }

    blogGrid.innerHTML = posts.map(post => `
      <div class="blog-card">
        <div class="blog-icon"><i class="${post.icon || 'fas fa-pen'}"></i></div>
        <h3>${post.title}</h3>
        <p>${post.content}</p>
        <div class="blog-meta">
          <span>${post.created_at}</span>
          ${post.tags ? `<span class="blog-tags">${post.tags.split(',').map(tag => `<span class="tag">${tag.trim()}</span>`).join(' ')}</span>` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    if (loading) loading.style.display = 'none';
    blogGrid.innerHTML = '<p>Error loading blog posts.</p>';
    console.error(err);
  }
}

// Run on page load
window.addEventListener('DOMContentLoaded', fetchAndDisplayPosts);
