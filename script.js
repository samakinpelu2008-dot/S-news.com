const apiKey = "b63a1ae1b48d4c8787db598937cdf789"; // paste your NewsAPI key here
const newsContainer = document.getElementById("news-container");
const buttons = document.querySelectorAll(".category");

function fetchNews(category = "general") {
  newsContainer.innerHTML = "<p>Loading news...</p>";

  // First try Nigerian news, fallback to global if empty
  const url = `https://newsapi.org/v2/top-headlines?country=ng&category=${category}&apiKey=${apiKey}`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.articles.length === 0) {
        // fallback to world news if Nigeria feed is empty
        return fetch(`https://newsapi.org/v2/top-headlines?category=${category}&language=en&apiKey=${apiKey}`)
          .then(res => res.json());
      }
      return data;
    })
    .then(data => {
      newsContainer.innerHTML = "";
      data.articles.forEach(article => {
        const div = document.createElement("div");
        div.className = "article";
        div.innerHTML = `
          <img src="${article.urlToImage || 'https://via.placeholder.com/400x200?text=S-News'}" alt="News image">
          <h3>${article.title || ''}</h3>
          <p>${article.description || ''}</p>
          <a href="${article.url}" target="_blank">Read more</a>
        `;
        newsContainer.appendChild(div);
      });
    })
    .catch(err => {
      newsContainer.innerHTML = "<p>Unable to load news. Please try again later.</p>";
      console.error(err);
    });
}

// Category switching
buttons.forEach(btn => {
  btn.addEventListener("click", () => {
    buttons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    fetchNews(btn.dataset.category);
  });
});

// Load top news by default
fetchNews();
