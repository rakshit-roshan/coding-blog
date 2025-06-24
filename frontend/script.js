fetch('https://coding-blog-tt47.onrender.com/api/posts')
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById('posts');
    data.forEach(post => {
      const div = document.createElement('div');
      div.innerHTML = `<h2><a href="post.html?id=${post.id}">${post.title}</a></h2>`;
      container.appendChild(div);
    });
  });


// Sample blog data (in a real app, this would come from your backend API)
const blogPosts = [
  {
    id: 1,
    title: "Building Scalable React Applications with TypeScript",
    excerpt: "Learn how to structure large React applications using TypeScript, focusing on type safety, component architecture, and performance optimization techniques.",
    date: "2025-06-20",
    icon: "fab fa-react",
    tags: ["React", "TypeScript", "Performance"]
  },
  {
    id: 2,
    title: "Microservices Architecture with Node.js and Docker",
    excerpt: "A comprehensive guide to building and deploying microservices using Node.js, Express, Docker containers, and orchestration with Kubernetes.",
    date: "2025-06-15",
    icon: "fab fa-node-js",
    tags: ["Node.js", "Docker", "Microservices"]
  },
  {
    id: 3,
    title: "Advanced PostgreSQL Query Optimization",
    excerpt: "Deep dive into PostgreSQL performance tuning, indexing strategies, query planning, and advanced SQL techniques for high-traffic applications.",
    date: "2025-06-10",
    icon: "fas fa-database",
    tags: ["PostgreSQL", "Database", "Performance"]
  },
  {
    id: 4,
    title: "Machine Learning with Python and TensorFlow",
    excerpt: "Getting started with machine learning using Python, TensorFlow, and scikit-learn. Build your first neural network from scratch.",
    date: "2025-06-05",
    icon: "fab fa-python",
    tags: ["Python", "ML", "TensorFlow"]
  },
  {
    id: 5,
    title: "AWS Lambda Serverless Best Practices",
    excerpt: "Optimize your serverless functions with AWS Lambda. Learn about cold starts, memory optimization, and cost-effective deployment strategies.",
    date: "2025-06-01",
    icon: "fab fa-aws",
    tags: ["AWS", "Serverless", "Lambda"]
  },
  {
    id: 6,
    title: "GraphQL API Design Patterns",
    excerpt: "Master GraphQL schema design, resolvers, and performance optimization. Build flexible APIs that scale with your application needs.",
    date: "2025-05-28",
    icon: "fas fa-project-diagram",
    tags: ["GraphQL", "API", "Backend"]
  }
];

let currentPage = 0;
const postsPerPage = 3;

// Load blog posts
function loadBlogPosts() {
  const blogGrid = document.getElementById('blogGrid');
  const loading = document.getElementById('loading');
  const loadMoreBtn = document.getElementById('loadMoreBtn');

  loading.style.display = 'block';

  setTimeout(() => {
    const startIndex = currentPage * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    const postsToShow = blogPosts.slice(startIndex, endIndex);

    postsToShow.forEach(post => {
      const blogCard = document.createElement('div');
      blogCard.className = 'blog-card fade-in';
      blogCard.innerHTML = `
          <div class="blog-image">
              <i class="${post.icon}"></i>
          </div>
          <div class="blog-content">
              <div class="blog-date">${new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <h3 class="blog-title">${post.title}</h3>
              <p class="blog-excerpt">${post.excerpt}</p>
              <a href="#" class="read-more" onclick="openPost(${post.id})">Read More →</a>
          </div>
      `;
      blogGrid.appendChild(blogCard);
    });

    loading.style.display = 'none';
    currentPage++;

    if (currentPage * postsPerPage < blogPosts.length) {
      loadMoreBtn.style.display = 'inline-block';
    } else {
      loadMoreBtn.style.display = 'none';
    }
  }, 1000);
}

// Open blog post (in a real app, this would navigate to a full post page)
function openPost(postId) {
  const post = blogPosts.find(p => p.id === postId);
  alert(`Opening post: "${post.title}"\n\nIn a real application, this would navigate to the full article page with syntax highlighting, comments, and sharing features.`);
}

// Contact form handling
document.getElementById('contactForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const formData = new FormData(this);
  const data = Object.fromEntries(formData);

  // Simulate form submission
  const submitBtn = this.querySelector('.submit-btn');
  const originalText = submitBtn.textContent;

  submitBtn.textContent = 'Sending...';
  submitBtn.disabled = true;

  setTimeout(() => {
    alert('Thank you for your message! I\'ll get back to you soon.');
    this.reset();
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }, 2000);
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Header scroll effect
window.addEventListener('scroll', function () {
  const header = document.querySelector('.header');
  if (window.scrollY > 100) {
    header.style.background = 'rgba(255, 255, 255, 0.98)';
    header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.1)';
  } else {
    header.style.background = 'rgba(255, 255, 255, 0.95)';
    header.style.boxShadow = 'none';
  }
});

// Load more button
document.getElementById('loadMoreBtn').addEventListener('click', loadBlogPosts);

// Initialize
document.addEventListener('DOMContentLoaded', function () {
  loadBlogPosts();
});

// Intersection Observer for animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function (entries) {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// Observe skill cards
document.querySelectorAll('.skill-card').forEach(card => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(30px)';
  card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(card);
});