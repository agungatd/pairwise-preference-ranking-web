// script.js

// --- Global Data Variable ---
// This will be populated from the CSV file
let loadedData = [];

// --- State Variables ---
let remainingPairs = [];
let currentPair = null;
let scores = {};
let totalComparisons = 0;
let comparisonsMade = 0;

// --- DOM Elements ---
const fileUploadSection = document.getElementById('file-upload-section');
const csvFileInput = document.getElementById('csv-file-input');
const loadCsvButton = document.getElementById('load-csv-button');
const loadingStatus = document.getElementById('loading-status');

const choiceSection = document.getElementById('choice-section');
const resultsSection = document.getElementById('results-section');
const cardLeft = document.getElementById('card-left');
const cardRight = document.getElementById('card-right');
const imgLeft = document.getElementById('img-left');
const titleLeft = document.getElementById('title-left');
const descLeft = document.getElementById('desc-left');
const imgRight = document.getElementById('img-right');
const titleRight = document.getElementById('title-right');
const descRight = document.getElementById('desc-right');
const rankingChartCanvas = document.getElementById('ranking-chart');
const rankingTableBody = document.querySelector('#ranking-table tbody');
const progressText = document.getElementById('progress-text');
const resetButton = document.getElementById('reset-button'); // Get reset button

// --- Constants for CSV Parsing ---
const REQUIRED_HEADERS = ['id', 'title', 'description', 'imageUrl'];

// --- Functions ---

/**
 * Basic CSV Parser
 * Assumes comma delimiter and double quotes for fields containing commas.
 * First row must be headers.
 * @param {string} csvText - The raw CSV text content.
 * @returns {Array|null} Parsed data as an array of objects, or null on error.
 */
function parseCSV(csvText) {
    try {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            throw new Error("CSV must have a header row and at least one data row.");
        }

        // Extract headers, trim whitespace
        const headers = lines[0].split(',').map(h => h.trim());

        // Validate headers
        const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            throw new Error(`Missing required CSV headers: ${missingHeaders.join(', ')}`);
        }

        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines

            // Basic handling for quoted commas (can be improved for more complex CSVs)
            const values = [];
            let currentVal = '';
            let inQuotes = false;
            for (let char of line) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(currentVal.trim().replace(/^"|"$/g, '')); // Remove surrounding quotes
                    currentVal = '';
                } else {
                    currentVal += char;
                }
            }
            values.push(currentVal.trim().replace(/^"|"$/g, '')); // Add the last value

            if (values.length !== headers.length) {
                 console.warn(`Row ${i + 1} has incorrect number of columns. Skipping.`);
                 continue; // Skip rows with mismatched columns
            }

            const rowObject = {};
            headers.forEach((header, index) => {
                 // Ensure ID is treated as a number if possible, otherwise string
                 if (header === 'id') {
                     rowObject[header] = !isNaN(parseInt(values[index])) ? parseInt(values[index]) : values[index];
                 } else {
                    rowObject[header] = values[index];
                 }
            });
            data.push(rowObject);
        }

        // Check for duplicate IDs
        const ids = new Set();
        for (const item of data) {
            if (ids.has(item.id)) {
                 throw new Error(`Duplicate ID found in CSV: ${item.id}`);
            }
            ids.add(item.id);
        }


        return data;
    } catch (error) {
        console.error("CSV Parsing Error:", error);
        loadingStatus.textContent = `Error parsing CSV: ${error.message}`;
        loadingStatus.classList.add('text-red-500');
        return null;
    }
}


/**
 * Handles the file selection and loading process.
 */
function handleFileLoad() {
    const file = csvFileInput.files[0];
    if (!file) {
        loadingStatus.textContent = "Please select a CSV file.";
        loadingStatus.classList.add('text-red-500');
        return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
        loadingStatus.textContent = "Please select a valid CSV file (.csv extension).";
        loadingStatus.classList.add('text-red-500');
        csvFileInput.value = ''; // Reset file input
        return;
    }

    loadingStatus.textContent = "Loading and parsing file...";
    loadingStatus.classList.remove('text-red-500', 'text-green-500');
    loadCsvButton.disabled = true; // Disable button while loading

    const reader = new FileReader();

    reader.onload = function(event) {
        const csvText = event.target.result;
        const parsedData = parseCSV(csvText);

        if (parsedData && parsedData.length >= 2) {
            loadedData = parsedData; // Store parsed data globally
            loadingStatus.textContent = `Successfully loaded ${loadedData.length} items. Starting ranking...`;
            loadingStatus.classList.add('text-green-500');
            // Hide file upload, show choices
            fileUploadSection.style.opacity = '0';
            setTimeout(() => {
                 fileUploadSection.style.display = 'none';
                 choiceSection.style.display = 'block'; // Or 'flex' if needed by layout
                 setTimeout(() => choiceSection.classList.add('visible'), 50); // Fade in
                 startRankingProcess(loadedData); // Start the ranking logic
            }, 500); // Wait for fade out transition

        } else if (parsedData && parsedData.length < 2) {
            loadingStatus.textContent = "CSV loaded, but needs at least 2 items to rank.";
            loadingStatus.classList.add('text-red-500');
            loadCsvButton.disabled = false; // Re-enable button
             csvFileInput.value = ''; // Reset file input

        } else {
            // Error message already set by parseCSV
             loadCsvButton.disabled = false; // Re-enable button
             csvFileInput.value = ''; // Reset file input
        }
    };

    reader.onerror = function() {
        loadingStatus.textContent = "Error reading the file.";
        loadingStatus.classList.add('text-red-500');
        loadCsvButton.disabled = false; // Re-enable button
        csvFileInput.value = ''; // Reset file input
    };

    reader.readAsText(file);
}


/**
 * Starts the ranking process after data is loaded.
 * @param {Array} dataItems - The array of data items loaded from CSV.
 */
function startRankingProcess(dataItems) {
    // Reset state variables for ranking
    remainingPairs = [];
    currentPair = null;
    scores = {};
    totalComparisons = 0;
    comparisonsMade = 0;

    // 1. Initialize scores
    initializeScores(dataItems);

    // 2. Generate and shuffle pairs
    remainingPairs = generatePairs(dataItems);
    shuffleArray(remainingPairs);
    totalComparisons = remainingPairs.length;

    if (totalComparisons === 0) {
        // Should have been caught earlier, but double-check
        choiceSection.innerHTML = '<p class="text-yellow-500 text-center">Not enough unique pairs to compare.</p>';
        return;
    }

    // 3. Display the first pair
    displayNextPair();
}


// --- (Keep Existing Functions: generatePairs, shuffleArray, initializeScores, updateCards, displayNextPair, updateProgress, handleChoice, displayResults, displayChart, displayTable) ---
// Make sure these functions now use `loadedData` when they need the full list, e.g., in displayResults.

/**
 * Generates all unique pairs of items from the data array.
 * @param {Array} items - The array of data items.
 * @returns {Array} An array of pairs, e.g., [[item1, item2], [item1, item3], ...]
 */
function generatePairs(items) {
    const pairs = [];
    if (items.length < 2) return pairs; // Need at least two items to form a pair

    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            pairs.push([items[i], items[j]]);
        }
    }
    return pairs;
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array} array - The array to shuffle.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
}

/**
 * Initializes the scores for all items to zero.
 * @param {Array} items - The array of data items.
 */
function initializeScores(items) {
    scores = {}; // Reset scores
    items.forEach(item => {
        scores[item.id] = 0;
    });
}

/**
 * Updates the content of the choice cards.
 * @param {Object} itemLeft - The item for the left card.
 * @param {Object} itemRight - The item for the right card.
 */
function updateCards(itemLeft, itemRight) {
    // Update Left Card
    imgLeft.src = itemLeft.imageUrl;
    imgLeft.alt = itemLeft.title;
    titleLeft.textContent = itemLeft.title;
    descLeft.textContent = itemLeft.description || ''; // Handle optional description

    // Update Right Card
    imgRight.src = itemRight.imageUrl;
    imgRight.alt = itemRight.title;
    titleRight.textContent = itemRight.title;
    descRight.textContent = itemRight.description || ''; // Handle optional description

    // Store the item IDs in the card elements for easy access on click
    cardLeft.dataset.itemId = itemLeft.id;
    cardRight.dataset.itemId = itemRight.id;
}

/**
 * Displays the next pair of choices or triggers the results display.
 */
function displayNextPair() {
    if (remainingPairs.length > 0) {
        currentPair = remainingPairs.pop(); // Get the next pair from the shuffled list
        // Randomly assign to left/right card
        if (Math.random() > 0.5) {
             updateCards(currentPair[0], currentPair[1]);
        } else {
             updateCards(currentPair[1], currentPair[0]);
        }
        updateProgress();
    } else {
        // No more pairs left, show results
        displayResults();
    }
}

/**
 * Updates the progress text.
 */
function updateProgress() {
    comparisonsMade++;
    progressText.textContent = `Choice ${comparisonsMade} of ${totalComparisons}`;
}


/**
 * Handles the click event on a choice card.
 * @param {Event} event - The click event object.
 */
function handleChoice(event) {
    const clickedCard = event.target.closest('.choice-card');
    if (!clickedCard) return;

    const chosenItemId = parseInt(clickedCard.dataset.itemId, 10);
    // Find the actual item object that was chosen (needed if ID isn't just a number, though it should be)
    // let chosenItem = null;
    // if (currentPair[0].id === chosenItemId) chosenItem = currentPair[0];
    // else if (currentPair[1].id === chosenItemId) chosenItem = currentPair[1];

    // Increment the score of the chosen item using its ID
    if (scores.hasOwnProperty(chosenItemId)) {
         scores[chosenItemId]++;
    } else {
         console.warn(`Chosen item ID ${chosenItemId} not found in scores.`);
    }


    // Display the next pair
    displayNextPair();
}

/**
 * Calculates the ranking based on scores and displays the results.
 */
function displayResults() {
    // Hide choice section, show results section
    choiceSection.classList.remove('visible');
    choiceSection.style.display = 'none'; // Hide completely
    resultsSection.style.display = 'block'; // Show results section container
    setTimeout(() => resultsSection.classList.add('visible'), 50); // Fade in results

    // Calculate ranked list using the originally loaded data
    const rankedItems = loadedData
        .map(item => ({
            ...item,
            score: scores[item.id] || 0 // Get score based on ID
        }))
        .sort((a, b) => b.score - a.score); // Sort descending by score

    // Display Chart (Top 10)
    displayChart(rankedItems.slice(0, 10));

    // Display Table (All items)
    displayTable(rankedItems);
}

/**
 * Displays the ranking chart using Chart.js.
 * @param {Array} topItems - Array of the top-ranked items (up to 10).
 */
function displayChart(topItems) {
    const ctx = rankingChartCanvas.getContext('2d');

    if (window.myRankingChart instanceof Chart) {
        window.myRankingChart.destroy();
    }

    window.myRankingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topItems.map(item => item.title),
            datasets: [{
                label: 'Preference Score',
                data: topItems.map(item => item.score),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, title: { display: true, text: 'Score' } },
                y: { title: { display: true, text: 'Item' } }
            }
        }
    });
    const chartContainer = rankingChartCanvas.parentElement;
    const itemHeight = 40;
    const minHeight = 200;
    chartContainer.style.height = `${Math.max(minHeight, topItems.length * itemHeight)}px`;
    window.myRankingChart.resize();
}

/**
 * Populates the ranking table with all ranked items.
 * @param {Array} rankedItems - Array of all items sorted by score.
 */
function displayTable(rankedItems) {
    rankingTableBody.innerHTML = '';
    rankedItems.forEach((item, index) => {
        const rank = index + 1;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" data-label="Rank">${rank}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700" data-label="Item">${item.title}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-label="Score">${item.score}</td>
        `;
        rankingTableBody.appendChild(row);
    });
}


/**
 * Resets the application to the initial file selection state.
 */
function resetApplication() {
    // Fade out results
    resultsSection.classList.remove('visible');
    setTimeout(() => {
        resultsSection.style.display = 'none';

        // Clear previous results/state
        rankingTableBody.innerHTML = '';
        if (window.myRankingChart instanceof Chart) {
            window.myRankingChart.destroy();
        }
        loadedData = [];
        remainingPairs = [];
        currentPair = null;
        scores = {};
        csvFileInput.value = ''; // Clear file input
        loadingStatus.textContent = '';
        loadingStatus.classList.remove('text-red-500', 'text-green-500');
        loadCsvButton.disabled = false;

         // Fade in file upload section
         fileUploadSection.style.display = 'block';
         setTimeout(() => fileUploadSection.style.opacity = '1', 50);


    }, 500); // Wait for fade out

}


// --- Initialization ---

function initializePage() {
    // Add event listeners
    loadCsvButton.addEventListener('click', handleFileLoad);
    cardLeft.addEventListener('click', handleChoice);
    cardRight.addEventListener('click', handleChoice);
    resetButton.addEventListener('click', resetApplication); // Add listener for reset

    // Initial state: show only file upload
    fileUploadSection.style.display = 'block';
    fileUploadSection.style.opacity = '1';
    choiceSection.style.display = 'none';
    resultsSection.style.display = 'none';
}

// --- Start the application ---
document.addEventListener('DOMContentLoaded', initializePage);