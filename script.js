document.addEventListener('DOMContentLoaded', function() {
  //const searchButton = document.getElementById('searchButton');
  const searchButton2 = document.getElementById('searchButton2');

  const prevNeuronButton = document.getElementById('previousButton');
  const nextNeuronButton = document.getElementById('nextButton');

  //searchButton.addEventListener('click', handleSearch);
  searchButton2.addEventListener('click', handleSearch);

  prevNeuronButton.addEventListener('click', goToPrevNeuron);
  nextNeuronButton.addEventListener('click', goToNextNeuron);
});

var resultsByLayer = {};
var allResults = [];
var count = [0, 0, 0, 0];
var totalcount = 0;

function handleSearch() {
  const resultsContainer = document.getElementById('searchResults');
  resultsContainer.innerHTML = '';
  resultsByLayer = {};
  allResults = [];
  imageContainer.innerHTML = '';

  // Hide buttons
  document.getElementById('previousButton').style.visibility = 'hidden';
  document.getElementById('nextButton').style.visibility = 'hidden';

  const searchType = document.querySelector('input[name="searchType"]:checked').value;

  if (searchType === 'number') {
    searchByNumber();
  } else if (searchType === 'concept') {
    searchByConcept();
  }
}

function searchByNumber() {
  const layerSelect = document.getElementById('layer');
  const neuronNumberInput = document.getElementById('neuronNumber');


  const layer = parseInt(layerSelect.value);
  const neuronNumber = parseInt(neuronNumberInput.value);

  if (isNaN(layer) || isNaN(neuronNumber)) {
    alert('Please select a valid layer and enter a valid neuron ID.');
    document.getElementById('previousButton').style.visibility = 'hidden';
    document.getElementById('nextButton').style.visibility = 'hidden';
    return;
  }
  document.getElementById('previousButton').style.visibility = 'visible';
  document.getElementById('nextButton').style.visibility = 'visible';
  const filePath = `assets/layer${layer}.csv`;
  const containerId = 'searchResults';
  loadLayer(layer, filePath, containerId, neuronNumber);
}

function goToPrevNeuron() {
  const layerSelect = document.getElementById('layer');
  const neuronNumberInput = document.getElementById('neuronNumber');
  let layer = parseInt(layerSelect.value);
  let neuronNumber = parseInt(neuronNumberInput.value);

  if (!isNaN(layer) && !isNaN(neuronNumber) && neuronNumber > 0) {
    neuronNumber--;
    neuronNumberInput.value = neuronNumber;
    searchByNumber();
  }
}

function goToNextNeuron() {
  const layerSelect = document.getElementById('layer');
  const neuronNumberInput = document.getElementById('neuronNumber');
  let layer = parseInt(layerSelect.value);
  let neuronNumber = parseInt(neuronNumberInput.value);

  if (!isNaN(layer) && !isNaN(neuronNumber) && neuronNumber < 2047) {
    neuronNumber++;
    neuronNumberInput.value = neuronNumber;
    searchByNumber();
  }
}

function handleConceptLinkClick(event) {
  event.preventDefault();

  const clickedLink = event.target;
  const concept = clickedLink.textContent.trim();

  const conceptInput = document.getElementById('conceptInput');
  conceptInput.value = concept;

  searchByConcept();
}

async function searchByConcept() {

  const conceptInput = document.getElementById('conceptInput');
  const concept = conceptInput.value.trim();

  // Hide buttons
  document.getElementById('previousButton').style.visibility = 'hidden';
  document.getElementById('nextButton').style.visibility = 'hidden';
  totalcount = 0;
  imageContainer.innerHTML = '';

  if (concept === '') {
    alert('Please provide a concept word for searching.');
    return;
  }

  const selectedLayers = getSelectedLayers();

  if (selectedLayers.length == 0) {
    alert('Please select at least one layer.');
    return;
  }

  const resultsContainer = document.getElementById('searchResults');
  resultsByLayer = {};
  allResults = [];
  resultsContainer.innerHTML = ''; // removes any previous results

  for (const layer of selectedLayers) {
    await searchConceptInLayer(concept, layer, resultsContainer);
    if (layer == selectedLayers[selectedLayers.length - 1]) {
      setTimeout(() => {
        updateConceptHistory(concept, selectedLayers); // Call the second function after a delay when the loop is completed
      }, 1000);
    }
  }


}
function getSelectedLayers() {
  const selectedLayers = [];
  const layerCheckboxes = document.querySelectorAll('input[name="layer"]:checked');

  layerCheckboxes.forEach(checkbox => {
    selectedLayers.push(parseInt(checkbox.value));
  });

  return selectedLayers;
}

function searchConceptInLayer(concept, layer, resultsContainer) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const filePath = `assets/layer${layer}.csv`;

      fetch(filePath)
        .then(response => response.text())
        .then(contents => processConceptSearchResults(contents, concept, layer, resultsContainer))
        .catch(error => {
          console.error('Error fetching the CSV file:', error);
          resultsContainer.innerHTML += `<p>Error loading data for Layer ${layer}</p>`;
        });
      resolve();
    }, 1000);
  });
}

async function processConceptSearchResults(contents, concept, infolayer, resultsContainer) {
  const rows = contents.split('\n');
  count[infolayer] = 0;
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].split(',');
    const conceptMap = cells.slice(1, 11).map(item => item.toLowerCase());

    if (conceptMap.includes(concept)) {
      count[infolayer] += 1;
      totalcount += 1;
      const neuronNumber = parseInt(cells[0]);
      const similarityValue = parseFloat(cells[conceptMap.indexOf(concept) + 11]).toFixed(3);

      const resultMessage = `Neuron ID ${neuronNumber} with Similarity Value: ${similarityValue}`;

      if (!resultsByLayer[infolayer]) {
        resultsByLayer[infolayer] = [];
      }

      resultsByLayer[infolayer].push({
        neuronNumber,
        similarityValue,
        resultMessage,
      });
      allResults.push({
        neuronNumber,
        infolayer,
        similarityValue,
        resultMessage,
      });
    }
  }

  resultsContainer.innerHTML = '';
  let newfileArr = [];
  let imagepaths = [];
  const neededlayers = getSelectedLayers();
  if(infolayer == neededlayers[neededlayers.length - 1]) {
    for (const layer in resultsByLayer) {
      resultsContainer.innerHTML += `<h3>Layer ${layer} -- ${count[layer]} "${concept}" neurons found </h3>`;
      resultsByLayer[layer].sort(function(b, a) {
        return a.similarityValue - b.similarityValue;
      });
      resultsContainer.innerHTML += '<h4>Example Images</h4>';


      const filePath = `assets/layer${layer}.csv`;
      await fetch(filePath)
      .then(response => response.text())
      .then(newContents => {
        newRows = newContents.split("\n");
        newfileArr = newRows[resultsByLayer[layer][0].neuronNumber + 1].split(",");
        newfileArr = newfileArr.slice(-20, -10);
        imagepaths = extractFilePaths(newfileArr);
        for (let path = 0; path < 3; path++) {
          resultsContainer.innerHTML += '<img src=' + imagepaths[path] + '>';
        }
      });

      let top_row = "<table class='neuronTable'><tr><td>Neuron ID</td>";
      let bottom_row = "<tr><td>Similarity</td>";
      let rowcount = 0;
      resultsByLayer[layer].forEach(result => {
        if (rowcount >= 10) {
          resultsContainer.innerHTML += top_row + bottom_row;
          top_row = "<table class='neuronTable'><tr><td>Neuron ID</td>";
          bottom_row = "<tr><td>Similarity</td>";
          rowcount = 0;
        }
        // Include a clickable link for each result
        top_row += '<td><a href="#" class="neuron-link" data-layer="' + layer + '" data-neuron="' + result.neuronNumber + '">' + result.neuronNumber + '</a></td>';
        bottom_row += '<td>' + result.similarityValue + '</td>';
        rowcount += 1;
      });
      while (rowcount < 10) {
        top_row += '<td></td>';
        bottom_row += '<td></td>';
        rowcount += 1;
      }
      top_row += '</tr>';
      bottom_row += '</tr></table>';
      resultsContainer.innerHTML += top_row + bottom_row;
    }
    if (allResults.length == 0) {
      resultsContainer.innerHTML = '<h3>Concept not found in selected layers! Try a different concept.</h3>';
    }
  } else {
    resultsContainer.innerHTML = '<h3>Searching for Neurons...</h3><h4>Currently Searching Layer ' + infolayer + ' out of ' + neededlayers + '</h4>';
  }
  
  

  // Add event listener to neuron links
  const neuronLinks = document.querySelectorAll('.neuron-link');
  neuronLinks.forEach(link => {
    link.addEventListener('click', handleNeuronLinkClick);
  });
}

function updateConceptHistory(concept, layers) {
  allResults.sort(function(b, a) {
    return a.similarityValue - b.similarityValue;
  });

  const conceptHistoryContainer = document.getElementById('conceptHistory');
  let newConceptHistory = conceptHistoryContainer.innerHTML;
  newConceptHistory = newConceptHistory.slice(0, -8);
  if (!newConceptHistory.includes('<tr><td><a href="#" class="concept-link">' + concept + '</a></td><td>' + totalcount + '</td><td>' + layers + '</td>')) {
    newConceptHistory += '<tr><td><a href="#" class="concept-link">' + concept + '</a></td><td>' + totalcount + '</td><td>' + layers + '</td>';
    if (allResults.length != 0) {
      newConceptHistory += '<td><a href="#" class="neuron-link" data-layer="' + allResults[0].infolayer + '" data-neuron="' + allResults[0].neuronNumber + '">' + allResults[0].neuronNumber + ', Layer ' + allResults[0].infolayer + '</a></td>';
      newConceptHistory += '<td>' + allResults[0].similarityValue + '</td>';
    } else {
      newConceptHistory += '<td>No Neuron Found</td><td>No Neuron Found</td>';
    }
    newConceptHistory += '</tr>';
  }

  conceptHistoryContainer.innerHTML = newConceptHistory + "</table>";

  // Add the event listener for search functionality
  //const searchButton = document.getElementById('searchButton');
  //searchButton.addEventListener('click', handleSearch);

  const searchButton2 = document.getElementById('searchButton2');
  searchButton2.addEventListener('click', handleSearch);

  // Add event listeners for concept links
  const conceptLinks = document.querySelectorAll('.concept-link');
  conceptLinks.forEach(link => {
    link.addEventListener('click', handleConceptLinkClick);
  });
  const neuronLinks = document.querySelectorAll('.neuron-link');
  neuronLinks.forEach(link => {
    link.addEventListener('click', handleNeuronLinkClick);
  });

}

function handleNeuronLinkClick(event) {
  event.preventDefault();

  const clickedLink = event.target;
  const layer = parseInt(clickedLink.getAttribute('data-layer'));
  const neuronNumber = parseInt(clickedLink.getAttribute('data-neuron'));

  const layerSelect = document.getElementById('layer');
  const neuronNumberInput = document.getElementById('neuronNumber');
  layerSelect.value = layer;
  neuronNumberInput.value = neuronNumber;

  searchByNumber();
}


function loadLayer(layer, filePath, containerId, targetNeuronNumber) {
  return fetch(filePath)
    .then(response => response.text())
    .then(contents => displayNeuron(layer, contents, containerId, targetNeuronNumber))
    .catch(error => {
      console.error('Error fetching the CSV file:', error);
      const csvDataDisplay = document.getElementById(containerId);
      csvDataDisplay.innerHTML = 'Failed to load the CSV file.';
    });
}

function displayNeuron(layer, contents, containerId, targetNeuronNumber) {
  let ignore = false;
  const csvDataDisplay = document.getElementById(containerId);
  let htmlContent = '<h2>Dissection Results:</h2>';
  let htmlContentPaths = '';
  let found = false;
  let topk = document.getElementById('topk').value;
  if (!(0 < topk && topk < 11)) {
    topk = 10;
    document.getElementById('topk').value = topk;
  }

  const imageContainer = document.getElementById('imageContainer');
  imageContainer.innerHTML = '';

  const historyContainer = document.getElementById('historyContainer');
  let newHistory = historyContainer.innerHTML;
  newHistory = newHistory.slice(0, -8);
  const rows = contents.split('\n');

  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].split(',');
    const neuronNumber = parseInt(cells[0]);

    if (!isNaN(neuronNumber) && neuronNumber === targetNeuronNumber) {

      htmlContent += '<p>';
      for (let j = 0; j < cells.length; j++) {
        htmlContentPaths += cells[j] + ', ';
      }
      for (let neuron = 0; neuron < cells.slice(0, 1).length; neuron++) {
        htmlContent += 'Neuron ID: ';
        htmlContent += cells[neuron];
        if (newHistory.includes('<td>' + '<a href="#" class="neuron-link" data-layer="' + layer + '" data-neuron="' + cells[neuron] + '">' + cells[neuron] + '</a>' + '</td><td>' + layer + '</td>')) {
          ignore = true;
        }
        if (!ignore) {
          newHistory += '<tr><td>' + '<a href="#" class="neuron-link" data-layer="' + layer + '" data-neuron="' + cells[neuron] + '">' + cells[neuron] + '</a>' + '</td><td>' + layer + '</td>';
        }
        if (neuron == 0) {
          htmlContent += '<br>';
        }
      }
      htmlContent += '<h3>Top-' + topk + ' Concepts</h3>';
      htmlContent += '<p>[';
      for (let descriptions = 0; descriptions < topk; descriptions++) {
        const concept = cells[descriptions + 1];
        if (descriptions == 0) {
          htmlContent += "<b>";
          if (!ignore) {
            newHistory += "<td>" + '<a href="#" class="concept-link">' + concept + '</a>' + "</td>";
          }
        }

        htmlContent += '<a href="#" class="concept-link">' + concept + '</a>' + ', ';
        if (descriptions == topk - 1) {
          htmlContent = htmlContent.slice(0, -2);
        }
        if (descriptions == 0) {
          htmlContent += "</b>";
        }
      }

      htmlContent += ']</p>';

      htmlContent += '<h3>Top-' + topk + ' Similarities</h3>';
      htmlContent += '<p>[';
      for (let descriptions = 0; descriptions < topk; descriptions++) {
        const concept = parseFloat(cells[descriptions + 11]).toFixed(3);

        if (descriptions == 0) {
          htmlContent += "<b>";
          if (!ignore) {
            newHistory += "<td>" + concept + "</td>";
          }
        }
        htmlContent += concept + ', ';
        if (descriptions == topk - 1) {
          htmlContent = htmlContent.slice(0, -2);
        }
        if (descriptions == 0) {
          htmlContent += "</b>";
        }
      }


      htmlContent += ']</p>';
      if (!ignore) {
        historyContainer.innerHTML = newHistory + "</tr></table>";
      } else {
        historyContainer.innerHTML = newHistory + "</table>";
      }
      found = true;
      break;

    }
  }

  if (!found) {
    htmlContent += '<p>No data found for the specified neuron in this layer, or out of bounds. Please pick a neuron value between [0, ' + (rows.length - 3) + '].</p>';
    document.getElementById('previousButton').style.visibility = 'hidden';
    document.getElementById('nextButton').style.visibility = 'hidden';
  }

  csvDataDisplay.innerHTML = htmlContent;

  if (found) {
    const imageContainer = document.getElementById('imageContainer');
    imageContainer.innerHTML = '<h3>Highly activated images for Neuron ' + targetNeuronNumber + ', Layer ' + layer + ':</h3>';

    var fileArr = htmlContentPaths.split(', ');
    fileArr = fileArr.slice(-21, -11);
    const formattedFilePaths = extractFilePaths(fileArr);

    for (let path = 0; path < formattedFilePaths.length; path++) {
      const imageElement = document.createElement('img');
      imageElement.src = formattedFilePaths[path];
      imageContainer.appendChild(imageElement);
    }
  }

  // Add the event listener for search functionality
  //const searchButton = document.getElementById('searchButton');
  //searchButton.addEventListener('click', handleSearch);

  const searchButton2 = document.getElementById('searchButton2');
  searchButton2.addEventListener('click', handleSearch);

  // Add event listeners for concept links
  const conceptLinks = document.querySelectorAll('.concept-link');
  conceptLinks.forEach(link => {
    link.addEventListener('click', handleConceptLinkClick);
  });
  const neuronLinks = document.querySelectorAll('.neuron-link');
  neuronLinks.forEach(link => {
    link.addEventListener('click', handleNeuronLinkClick);
  });
}

function extractFilePaths(fileArr) {
  const formattedFilePaths = [];

  for (let path = 0; path < fileArr.length; path++) {
    individPath = fileArr[path].replace('data/broden1_224/images/', '')
    const formattedPath = `https://broden-images.s3.us-west-2.amazonaws.com/${individPath}`;
    formattedFilePaths.push(formattedPath);
  }

  return formattedFilePaths;
}