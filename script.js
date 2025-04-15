// script.js

// --- Data ---
// Replace this with your actual list of items.
// Ensure each item has a unique 'id', 'title', 'description', and 'imageUrl'.
const data = [
    { id: 1, title: "Modern City Apartment", description: "Sleek design in the heart of the city.", imageUrl: "https://placehold.co/600x400/a2d2ff/ffffff?text=City+Apt" },
    { id: 2, title: "Cozy Country Cottage", description: "Rustic charm surrounded by nature.", imageUrl: "https://placehold.co/600x400/ffafcc/ffffff?text=Cottage" },
    { id: 3, title: "Tropical Beach Villa", description: "Ocean views and sandy shores.", imageUrl: "https://placehold.co/600x400/bde0fe/ffffff?text=Beach+Villa" },
    { id: 4, title: "Mountain Log Cabin", description: "Warm fireplace and mountain air.", imageUrl: "https://placehold.co/600x400/cddafd/ffffff?text=Cabin" },
    { id: 5, title: "Suburban Family Home", description: "Spacious and comfortable for families.", imageUrl: "https://placehold.co/600x400/fcf6bd/ffffff?text=Suburban" },
    { id: 6, title: "Minimalist Loft", description: "Open space with industrial vibes.", imageUrl: "https://placehold.co/600x400/d0f4de/ffffff?text=Loft" },
    { id: 7, title: "Historic Townhouse", description: "Classic architecture and elegance.", imageUrl: "https://placehold.co/600x400/e4c1f9/ffffff?text=Townhouse" },
    { id: 8, title: "Riverside Retreat", description: "Peaceful living by the water.", imageUrl: "https://placehold.co/600x400/f7d1cd/ffffff?text=Riverside" },
    // Add more items as needed
];

// --- State Variables ---
let remainingPairs = []; // Array to hold the pairs of items yet to be shown
let currentPair = null; // The current pair being displayed [item1, item2]
let scores = {}; // Object to store scores for each item { itemId: score }
let totalComparisons = 0; // Total number of comparisons to be made
let comparisonsMade = 0; // Number of comparisons already made

// --- DOM Elements ---
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

// --- Functions ---

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
    // Find the clicked card element (even if the click was on an inner element)
    const clickedCard = event.target.closest('.choice-card');
    if (!clickedCard) return; // Exit if the click wasn't on a card

    const chosenItemId = parseInt(clickedCard.dataset.itemId, 10);

    // Increment the score of the chosen item
    if (scores.hasOwnProperty(chosenItemId)) {
        scores[chosenItemId]++;
    }

    // Display the next pair
    displayNextPair();
}

/**
 * Calculates the ranking based on scores and displays the results.
 */
function displayResults() {
    // Hide choice section, show results section
    choiceSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');

    // Calculate ranked list
    const rankedItems = data
        .map(item => ({
            ...item,
            score: scores[item.id] || 0
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

    // Destroy previous chart instance if it exists
    if (window.myRankingChart instanceof Chart) {
        window.myRankingChart.destroy();
    }

    window.myRankingChart = new Chart(ctx, {
        type: 'bar', // Use 'bar' for horizontal bars
        data: {
            labels: topItems.map(item => item.title),
            datasets: [{
                label: 'Preference Score',
                data: topItems.map(item => item.score),
                backgroundColor: 'rgba(54, 162, 235, 0.6)', // Blue bars
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // This makes the bar chart horizontal
            responsive: true,
            maintainAspectRatio: false, // Allow chart to resize vertically
            plugins: {
                legend: {
                    display: false // Hide legend as it's obvious
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` Score: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                x: { // Now the value axis is X
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Score'
                    }
                },
                y: { // The category axis is Y
                    title: {
                        display: true,
                        text: 'Item'
                    }
                }
            }
        }
    });
     // Adjust canvas container height based on number of items for better readability
    const chartContainer = rankingChartCanvas.parentElement;
    const itemHeight = 40; // Estimated height per bar + spacing
    const minHeight = 200; // Minimum chart height
    chartContainer.style.height = `${Math.max(minHeight, topItems.length * itemHeight)}px`;
    window.myRankingChart.resize(); // Ensure chart redraws with new size

}

/**
 * Populates the ranking table with all ranked items.
 * @param {Array} rankedItems - Array of all items sorted by score.
 */
function displayTable(rankedItems) {
    rankingTableBody.innerHTML = ''; // Clear previous table content

    rankedItems.forEach((item, index) => {
        const rank = index + 1;
        const row = document.createElement('tr');

        // Add data-label attributes for responsive view
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" data-label="Rank">${rank}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700" data-label="Item">${item.title}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-label="Score">${item.score}</td>
        `;
        rankingTableBody.appendChild(row);
    });
}


// --- Initialization ---

/**
 * Sets up the initial state of the application.
 */
function initialize() {
    if (data.length < 2) {
         choiceSection.innerHTML = '<p class="text-red-500 text-center">Error: Need at least two items to start the ranking process.</p>';
         return;
    }

    // 1. Initialize scores
    initializeScores(data);

    // 2. Generate and shuffle pairs
    remainingPairs = generatePairs(data);
    shuffleArray(remainingPairs);
    totalComparisons = remainingPairs.length;
    comparisonsMade = 0;


    if (totalComparisons === 0) {
         choiceSection.innerHTML = '<p class="text-yellow-500 text-center">Not enough unique pairs to compare.</p>';
         return;
    }


    // 3. Add event listeners
    cardLeft.addEventListener('click', handleChoice);
    cardRight.addEventListener('click', handleChoice);

    // 4. Display the first pair
    displayNextPair();
}

// --- Start the application ---
// Use DOMContentLoaded to ensure the DOM is fully loaded before running the script
document.addEventListener('DOMContentLoaded', initialize);
