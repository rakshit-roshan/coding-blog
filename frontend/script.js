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
      const res = await fetch('https://coding-blog-tt47.onrender.com/api/posts', {
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
