$(function () {
    $("#language").on("click", function (e) {
      redirect = this.value;
      console.log(redirect);
      switch (redirect) {
        case "English":
          window.location.href = "index_en.html";
          break;
        case "Francais":
          window.location.href = "index.html";
          break;
      }
    });
  });