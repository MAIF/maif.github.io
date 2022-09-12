const slogan = document.querySelector("#slogan");
function stickyNavigation() {
  if (window.scrollY >= 200) {
    slogan.style.opacity = 1;
  } else {
    slogan.style.opacity = window.scrollY / 200;
  }
}

window.addEventListener("scroll", stickyNavigation);