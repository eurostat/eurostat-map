const buildCustomDropdown = (dropdownOptions, map) => {
  // Get the custom select trigger and options wrapper
  const customSelectTrigger = document.querySelector(".select-trigger");
  const customOptionsWrapper = document.querySelector(".custom-options");
  const selectWrapper = document.getElementById("select-wrapper");

  // Populate the custom select dropdown dynamically using the array structure
  dropdownOptions.forEach((optionData, index) => {
    const option = document.createElement("li");
    option.classList.add("custom-option");
    option.setAttribute("data-index", index); // Store index in the option
    option.textContent = optionData.label;
    customOptionsWrapper.appendChild(option);
  });

  // Track if dropdown navigation is active
  let dropdownActive = false;
  let options = Array.from(customOptionsWrapper.querySelectorAll(".custom-option"));
  let activeOptionIndex = options.findIndex((option) => option.classList.contains("selected"));

  // Function to highlight the option
  function highlightOption(index) {
    options.forEach((option) => option.classList.remove("selected"));
    options[index].classList.add("selected");
    customSelectTrigger.textContent = options[index].textContent;
    activeOptionIndex = index;
  }

  // Select the first item by default
  highlightOption(0);

  // Event listener for arrow keys and enter
  document.addEventListener("keydown", function (event) {
    if (dropdownActive || event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (event.key === "ArrowDown" && activeOptionIndex < options.length - 1) {
        highlightOption(activeOptionIndex + 1);
        options[activeOptionIndex].click(); // Simulate click on the selected option
      } else if (event.key === "ArrowUp" && activeOptionIndex > 0) {
        highlightOption(activeOptionIndex - 1);
        options[activeOptionIndex].click(); // Simulate click on the selected option
      } else if (event.key === "Enter") {
        options[activeOptionIndex].click(); // Simulate click on the selected option
        dropdownActive = false; // After selection, stop active arrow navigation
      }
      event.preventDefault(); // Prevent default behavior
    }
  });

  // Add event listener to open the dropdown when clicking
  selectWrapper.addEventListener("click", function () {
    customOptionsWrapper.classList.toggle("open");
    dropdownActive = true; // Activate arrow key navigation when dropdown is open
  });

  // Add event listener to set dropdownActive to true after selecting an option
  customOptionsWrapper.addEventListener("click", function () {
    dropdownActive = true; // Keep arrow key navigation active after selection
  });

  // Close the dropdown and disable arrow key navigation when clicking outside
  document.addEventListener("click", function (event) {
    const isClickInside = selectWrapper.contains(event.target) || customOptionsWrapper.contains(event.target);
    if (!isClickInside) {
      dropdownActive = false; // Disable arrow key navigation
      customOptionsWrapper.classList.remove("open"); // Close dropdown
    }
  });

  // Add event listener to handle selection and fetch data
  customOptionsWrapper.addEventListener("click", function (event) {
    const clickedOption = event.target;

    // Update the activeOptionIndex to the clicked option's index
    activeOptionIndex = options.indexOf(clickedOption);

    // Remove 'selected' class from all options
    options.forEach((option) => option.classList.remove("selected"));

    // Add 'selected' class to the clicked option (for blue background and white text)
    clickedOption.classList.add("selected");

    // Update the select trigger text and title with the selected option title
    const selectedIndex = parseInt(clickedOption.getAttribute("data-index"), 10);
    const selectedOption = dropdownOptions[selectedIndex]
    customSelectTrigger.textContent = selectedOption.label;
    selectWrapper.title = selectedOption.label;

    // Close the dropdown
    customOptionsWrapper.classList.remove("open");

    // update eurostat-map map
    updateMap(selectedOption, map);

    //set titles
    setTitles(selectedOption.title,selectedOption.subtitle)

    event.stopPropagation();
  });

  // Close the dropdown when clicking outside
  document.addEventListener("click", function (event) {
    const isClickInside = selectWrapper.contains(event.target) || customOptionsWrapper.contains(event.target);
    if (!isClickInside) {
      customOptionsWrapper.classList.remove("open");
    }
  });
};

