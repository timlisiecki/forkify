// Global app controller
import Search from './models/Search';
import Recipe from './models/Recipe';
import List from './models/List';
import Likes from './models/Likes';
import * as searchView from './views/searchView';
import * as recipeView from './views/recipeView';
import * as listView from './views/listView';
import * as likesView from './views/likesView';
import {elements, renderLoader, clearLoader} from './views/base';

/** Global state of the app
 * - Search object
 * - Current recipe object
 * - Shopping list object
 * - Liked recipes
*/
const state = {};

/**
 * SEARCH CONTROLLER
*/
const controlSearch = async () => {
    // 1) Get query from view
    const query = searchView.getInput();

    if (query) {
        // 2) New search object and add it to state
        state.search = new Search(query);

        // 3) Prepare UI for results
        searchView.clearInput();
        searchView.clearResults();
        renderLoader(elements.searchRes);

        try {
            // 4) Search for recipes
            await state.search.getResults();

            // 5) Render results on the UI
            clearLoader();
            elements.searchForm.classList.remove('search--error');
            elements.searchErrorMsg.innerHTML = '';
            elements.searchErrorMsg.style.visibility = 'hidden';
            searchView.renderResults(state.search.result);
        } catch (error) {
            // alert('Something wrong with the search ...');
            elements.searchForm.classList.add('search--error');
            elements.searchErrorMsg.innerHTML = '<p style="padding-top: 0.5rem; font-size: 1rem; color: rgba(255, 0, 0, 0.8);">Recipe not found. Try searching for something else or use a suggested query from the link below.</p>';
            elements.searchErrorMsg.style.visibility = 'visible';
            clearLoader();
        }
    }
};

elements.searchForm.addEventListener('submit', e => {
    e.preventDefault();
    controlSearch();
});

elements.searchResPages.addEventListener('click', e => {
    const btn = e.target.closest('.btn-inline');
    if (btn) {
        const goToPage = parseInt(btn.dataset.goto, 10);
        searchView.clearResults();
        searchView.renderResults(state.search.result, goToPage);
    }
});

/**
 * RECIPE CONTROLLER
*/
const controlRecipe = async () => {
    // Get ID from URL
    const id = window.location.hash.replace('#', '');

    if (id) {
        // Prepare the UI for changes
        recipeView.clearRecipe();
        renderLoader(elements.recipe);

        // Highlight selected search item
        if (state.search) searchView.highlightSelected(id);

        // Create a new recipe object
        state.recipe = new Recipe(id);

        try {
            // Get recipe data
            await state.recipe.getRecipe();
            state.recipe.parseIngredients();

            // Calculate servings and time
            state.recipe.calcTime();
            state.recipe.calcServings();

            // Render recipe
            clearLoader();
            recipeView.renderRecipe(
                state.recipe,
                state.likes.isLiked(id),
            );
        } catch (error) {
            console.log(error);
            console.log('Error processing recipe.');
            clearLoader();
            elements.recipe.innerHTML = '<p style="margin: 1rem 2rem; font-size: 1.5rem; color: rgba(255, 0, 0, 0.8);">Recipe not found. Please search <a href="https://forkify-api.herokuapp.com/phrases.html" target="_blank">here</a> for another recipe using the list of available search queries.</p>'
        }
    }
}

['hashchange', 'load'].forEach(event => window.addEventListener(event, controlRecipe));

/**
 * LIST CONTROLLER
*/
const controlList = () => {
    // Create a new list if none yet
    if (!state.list) state.list = new List();

    // Add each ingredient to the list and UI
    state.recipe.ingredients.forEach(el => {
        const item = state.list.addItem(el.count, el.unit, el.ingredient);
        listView.renderItem(item);
    });
}

// Handle delete and update list item events
elements.shoppingList.addEventListener('click', e => {
    const id = e.target.closest('.shopping__item').dataset.itemid;

    // Handle delete buttin
    if (e.target.matches('.shopping__delete, .shopping__delete *')) {
        // Delete from state
        state.list.deleteItem(id);
        // Delete from UI
        listView.deleteItem(id);

    // Handle the count update
    } else if (e.target.matches('.shopping__count-value')) {
        const val = parseFloat(e.target.value, 10);

        state.list.updateCount(id, val);
    }
});

// Restore shopping list on page load
window.addEventListener('load', () => {
    state.list = new List();
    // Restores likes
    if(state.list) state.list.readStorage();
    // Render the existing list
    state.list.items.forEach(item => listView.renderItem(item));
});

// Handle clear cart
elements.shopping.addEventListener('click', e => {
    // Clear cart from UI
    if (e.target.matches('.shopping__list--remove')) {
        state.list.clearList();
        listView.clearCart();
    }
});

/**
 * LIKES CONTROLLER
*/
const controlLike = () => {
    if (!state.likes) state.likes = new Likes();

    // User has not yet liked current recipe
    const currentID = state.recipe.id;
    if (!state.likes.isLiked(currentID)) {
        // Add like to the state
        const newLike = state.likes.addLike(
            currentID,
            state.recipe.title,
            state.recipe.author,
            state.recipe.img
        );
        // Toggle the like button
        likesView.toggleLikeBtn(true);
        // Add like to UI list
        likesView.renderLike(newLike);

    // User has liked current recipe
    } else {
        // Remove like from the state
        state.likes.deleteLike(currentID);
        // Toggle the like button
        likesView.toggleLikeBtn(false);
        // Remove like from UI list
        likesView.deleteLike(currentID);
    }
    likesView.toggleLikeMenu(state.likes.getNumLikes());
};

// Restore liked recipes on page load
window.addEventListener('load', () => {
    state.likes = new Likes();
    // Restores likes
    if(state.likes) state.likes.readStorage();
    // Toggle the like menu button
    likesView.toggleLikeMenu(state.likes.getNumLikes());
    // Render the existing likes
    state.likes.likes.forEach(like => likesView.renderLike(like));
});

// Delete likes list on click
elements.likes.addEventListener('click', e => {
    if (e.target.matches('.likes__btn--remove')) {
        // Clear the likes list from localStorage
        state.likes.clearLikesList();
        // Toggle the like menu button
        likesView.toggleLikeMenu(state.likes.getNumLikes());
        // Clear the likes from the list view
        likesView.deleteLikesList();
        likesView.toggleLikeBtn();
    }
})

// Handling recipe button clicks
elements.recipe.addEventListener('click', e => {
    if (e.target.matches('.btn-decrease, .btn-decrease *')) {
        // Decrease button is clicked
        if (state.recipe.servings > 1) {
            state.recipe.updateServings('dec');
            recipeView.updateServingsIngredients(state.recipe);
        }
    } else if (e.target.matches('.btn-increase, .btn-increase *')) {
        // Increase button is clicked
        state.recipe.updateServings('inc');
        recipeView.updateServingsIngredients(state.recipe);
    } else if (e.target.matches('.recipe__btn--add, .recipe__btn--add *')) {
        // Add ingredients to shopping list
        controlList();
    } else if (e.target.matches('.recipe__love, .recipe__love *')) {
        // Like controller
        controlLike();
    }
});