// script.js

// --- Global Data Variable ---
let loadedData = [];
let inputFilename = 'ranking_data.csv'; // Default filename if not loaded from file

// --- State Variables ---
let remainingPairs = [];
let currentPair = null;
let scores = {};
let totalComparisons = 0;
let comparisonsMade = 0;
let currentRankedItems = []; // Store the latest ranked results

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
const resetButton = document.getElementById('reset-button');
const saveResultsButton = document.getElementById('save-results-button'); // Get save button

// --- Constants for CSV Parsing ---
const REQUIRED_HEADERS = ['id', 'title', 'description', 'imageUrl'];

// --- Functions ---

// ...(Keep existing parseCSV, generatePairs, shuffleArray, initializeScores, updateCards, displayNextPair, updateProgress, handleChoice)...

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

    // *** Store the input filename ***
    inputFilename = file.name;

    loadingStatus.textContent = "Loading and parsing file...";
    loadingStatus.classList.remove('text-red-500', 'text-green-500');
    loadCsvButton.disabled = true;

    const reader = new FileReader();

    reader.onload = function(event) {
        const csvText = event.target.result;
        const parsedData = parseCSV(csvText);

        if (parsedData && parsedData.length >= 2) {
            loadedData = parsedData;
            loadingStatus.textContent = `Successfully loaded ${loadedData.length} items from ${inputFilename}. Starting ranking...`;
            loadingStatus.classList.add('text-green-500');
            fileUploadSection.style.opacity = '0';
            setTimeout(() => {
                 fileUploadSection.style.display = 'none';
                 choiceSection.style.display = 'block';
                 setTimeout(() => choiceSection.classList.add('visible'), 50);
                 startRankingProcess(loadedData);
            }, 500);

        } else if (parsedData && parsedData.length < 2) {
            loadingStatus.textContent = "CSV loaded, but needs at least 2 items to rank.";
            loadingStatus.classList.add('text-red-500');
            loadCsvButton.disabled = false;
            csvFileInput.value = '';
            inputFilename = 'ranking_data.csv'; // Reset filename

        } else {
            loadCsvButton.disabled = false;
            csvFileInput.value = '';
             inputFilename = 'ranking_data.csv'; // Reset filename
        }
    };

    reader.onerror = function() {
        loadingStatus.textContent = "Error reading the file.";
        loadingStatus.classList.add('text-red-500');
        loadCsvButton.disabled = false;
        csvFileInput.value = '';
        inputFilename = 'ranking_data.csv'; // Reset filename
    };

    reader.readAsText(file);
}

// ...(Keep startRankingProcess)...

/**
 * Calculates the ranking based on scores and displays the results.
 */
function displayResults() {
    choiceSection.classList.remove('visible');
    choiceSection.style.display = 'none';
    resultsSection.style.display = 'block';
    setTimeout(() => resultsSection.classList.add('visible'), 50);

    const rankedItems = loadedData
        .map(item => ({
            ...item,
            score: scores[item.id] || 0
        }))
        .sort((a, b) => b.score - a.score);

    // *** Store ranked items for saving ***
    currentRankedItems = rankedItems.map((item, index) => ({
        rank: index + 1, // Add rank directly to the object
        ...item
    }));


    displayChart(currentRankedItems.slice(0, 10));
    displayTable(currentRankedItems);

    // *** Enable the save button ***
    saveResultsButton.disabled = false;
}

// ...(Keep displayChart, displayTable)...

/**
 * Escapes a value for CSV format. Wraps in quotes if it contains comma, newline or quote.
 * Escapes existing quotes by doubling them.
 * @param {*} value - The value to escape.
 * @returns {string} - The CSV-safe string.
 */
function escapeCsvValue(value) {
    const stringValue = String(value == null ? "" : value); // Handle null/undefined
    if (/[",\n]/.test(stringValue)) {
        // Needs quoting
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}


/**
 * Generates CSV content string from ranked data.
 * @param {Array} rankedItemsWithRank - Array of items including rank property.
 * @returns {string} - The CSV content as a string.
 */
function generateRankedCSV(rankedItemsWithRank) {
    if (!rankedItemsWithRank || rankedItemsWithRank.length === 0) {
        return ""; // Return empty string if no data
    }

    // Define headers - explicitly include 'rank'
    const headers = ['rank', 'id', 'title', 'score', 'description', 'imageUrl'];
    const csvRows = [headers.join(',')]; // Header row

    // Create data rows
    rankedItemsWithRank.forEach(item => {
        const row = headers.map(header => escapeCsvValue(item[header]));
        csvRows.push(row.join(','));
    });

    return csvRows.join('\n'); // Join all rows with newline characters
}

/**
 * Triggers the download of a CSV file.
 * @param {string} csvContent - The content of the CSV file.
 * @param {string} filename - The desired name for the downloaded file.
 */
function downloadCSV(csvContent, filename) {
    // Create a Blob (Binary Large Object) from the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Create a temporary link element
    const link = document.createElement("a");

    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename); // Set the download attribute

    // Append the link to the body (required for Firefox), click it, and remove it
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Optional: Revoke the object URL to free up memory, though modern browsers often handle this.
    // URL.revokeObjectURL(url);
}

/**
 * Handles the click event for the Save Results button.
 */
function handleSaveResults() {
    if (currentRankedItems.length === 0) {
        console.warn("No ranked items available to save.");
        return;
    }

    // Generate CSV content
    const csvData = generateRankedCSV(currentRankedItems);

    // Determine filename
    const outputFilename = `fav-${inputFilename}`; // Prefix input filename

    // Trigger download
    downloadCSV(csvData, outputFilename);
}


/**
 * Resets the application to the initial file selection state.
 */
function resetApplication() {
    resultsSection.classList.remove('visible');
    setTimeout(() => {
        resultsSection.style.display = 'none';

        // Clear previous results/state
        rankingTableBody.innerHTML = '';
        if (window.myRankingChart instanceof Chart) {
            window.myRankingChart.destroy();
            window.myRankingChart = null; // Clear reference
        }
        loadedData = [];
        remainingPairs = [];
        currentPair = null;
        scores = {};
        currentRankedItems = []; // Clear saved ranks
        csvFileInput.value = '';
        loadingStatus.textContent = '';
        loadingStatus.classList.remove('text-red-500', 'text-green-500');
        loadCsvButton.disabled = false;
        saveResultsButton.disabled = true; // *** Disable save button on reset ***
        inputFilename = 'ranking_data.csv'; // Reset default filename

         // Fade in file upload section
         fileUploadSection.style.display = 'block';
         setTimeout(() => fileUploadSection.style.opacity = '1', 50);

    }, 500);
}


/**
 * Sets up the initial page state and event listeners.
 */
function initializePage() {
    // Add event listeners
    loadCsvButton.addEventListener('click', handleFileLoad);
    cardLeft.addEventListener('click', handleChoice);
    cardRight.addEventListener('click', handleChoice);
    resetButton.addEventListener('click', resetApplication);
    saveResultsButton.addEventListener('click', handleSaveResults); // *** Add listener for save ***

    // Initial state: show only file upload, disable save button
    fileUploadSection.style.display = 'block';
    fileUploadSection.style.opacity = '1';
    choiceSection.style.display = 'none';
    resultsSection.style.display = 'none';
    saveResultsButton.disabled = true; // Ensure it starts disabled
}

// --- Start the application ---
document.addEventListener('DOMContentLoaded', initializePage);


// --- Helper Functions (Keep unchanged) ---
// parseCSV, generatePairs, shuffleArray, initializeScores, updateCards,
// displayNextPair, updateProgress, handleChoice, displayChart, displayTable
// (Make sure parseCSV, initializeScores, updateCards, displayNextPair,
// handleChoice, displayChart, displayTable are present from previous steps)

// --- Re-include necessary helper functions if they were removed ---

function parseCSV(csvText) {
    try {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row.");
        const headers = lines[0].split(',').map(h => h.trim());
        const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) throw new Error(`Missing required CSV headers: ${missingHeaders.join(', ')}`);

        const data = [];
        const ids = new Set();
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const values = [];
            let currentVal = '';
            let inQuotes = false;
            for (let char of line) {
                if (char === '"') inQuotes = !inQuotes;
                else if (char === ',' && !inQuotes) {
                    values.push(currentVal.trim().replace(/^"|"$/g, '')); currentVal = '';
                } else currentVal += char;
            }
            values.push(currentVal.trim().replace(/^"|"$/g, ''));
            if (values.length !== headers.length) { console.warn(`Row ${i + 1} has incorrect number of columns. Skipping.`); continue; }
            const rowObject = {};
            headers.forEach((header, index) => {
                 if (header === 'id') rowObject[header] = !isNaN(parseInt(values[index])) ? parseInt(values[index]) : values[index];
                 else rowObject[header] = values[index];
            });
             if (ids.has(rowObject.id)) throw new Error(`Duplicate ID found in CSV: ${rowObject.id}`);
             ids.add(rowObject.id);
            data.push(rowObject);
        }
        return data;
    } catch (error) {
        console.error("CSV Parsing Error:", error);
        loadingStatus.textContent = `Error parsing CSV: ${error.message}`;
        loadingStatus.classList.add('text-red-500');
        return null;
    }
}

function generatePairs(items) {
    const pairs = [];
    if (items.length < 2) return pairs;
    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) pairs.push([items[i], items[j]]);
    } return pairs;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function initializeScores(items) {
    scores = {}; items.forEach(item => { scores[item.id] = 0; });
}

function updateCards(itemLeft, itemRight) {
    imgLeft.src = itemLeft.imageUrl; imgLeft.alt = itemLeft.title; titleLeft.textContent = itemLeft.title; descLeft.textContent = itemLeft.description || '';
    imgRight.src = itemRight.imageUrl; imgRight.alt = itemRight.title; titleRight.textContent = itemRight.title; descRight.textContent = itemRight.description || '';
    cardLeft.dataset.itemId = itemLeft.id; cardRight.dataset.itemId = itemRight.id;
}

function displayNextPair() {
    if (remainingPairs.length > 0) {
        currentPair = remainingPairs.pop();
        if (Math.random() > 0.5) updateCards(currentPair[0], currentPair[1]);
        else updateCards(currentPair[1], currentPair[0]);
        updateProgress();
    } else displayResults();
}

function updateProgress() {
    comparisonsMade++; progressText.textContent = `Choice ${comparisonsMade} of ${totalComparisons}`;
}

function handleChoice(event) {
    const clickedCard = event.target.closest('.choice-card'); if (!clickedCard) return;
    const chosenItemId = parseInt(clickedCard.dataset.itemId, 10);
    if (scores.hasOwnProperty(chosenItemId)) scores[chosenItemId]++;
    else console.warn(`Chosen item ID ${chosenItemId} not found in scores.`);
    displayNextPair();
}

function displayChart(topItems) {
    const ctx = rankingChartCanvas.getContext('2d');
    if (window.myRankingChart instanceof Chart) window.myRankingChart.destroy();
    window.myRankingChart = new Chart(ctx, { /* ... chart config ... */
         type: 'bar', data: { labels: topItems.map(item => item.title), datasets: [{ label: 'Preference Score', data: topItems.map(item => item.score), backgroundColor: 'rgba(54, 162, 235, 0.6)', borderColor: 'rgba(54, 162, 235, 1)', borderWidth: 1 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, title: { display: true, text: 'Score' } }, y: { title: { display: true, text: 'Item' } } } }
    });
    const chartContainer = rankingChartCanvas.parentElement; const itemHeight = 40; const minHeight = 200; chartContainer.style.height = `${Math.max(minHeight, topItems.length * itemHeight)}px`; window.myRankingChart.resize();
}

function displayTable(rankedItems) {
    rankingTableBody.innerHTML = '';
    rankedItems.forEach((item) => { // Rank is already in item object
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" data-label="Rank">${item.rank}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700" data-label="Item">${item.title}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-label="Score">${item.score}</td>
        `;
        rankingTableBody.appendChild(row);
    });
}

function startRankingProcess(dataItems) {
    remainingPairs = []; currentPair = null; scores = {}; totalComparisons = 0; comparisonsMade = 0;
    initializeScores(dataItems);
    remainingPairs = generatePairs(dataItems); shuffleArray(remainingPairs); totalComparisons = remainingPairs.length;
    if (totalComparisons === 0) { choiceSection.innerHTML = '<p class="text-yellow-500 text-center">Not enough unique pairs to compare.</p>'; return; }
    displayNextPair();
}