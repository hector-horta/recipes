// ── Semilla de Datos de Grado Médico (Desarrollo) ──────────────────
// Estos datos simulan la estructura de respuesta de Spoonacular
// permitiendo desarrollo Offline y sin consumo de Cuota.

export const MOCK_RECIPE_DATA = [
  {
    id: 715415,
    title: "Red Lentil Soup with Chicken and Turnips",
    image: "https://img.spoonacular.com/recipes/715415-556x370.jpg",
    readyInMinutes: 55,
    pricePerServing: 244,
    diets: ["gluten free", "dairy free"],
    summary: "A hearty and nutritious soup with lentils, chicken, and fresh vegetables.",
    extendedIngredients: [
      { id: 1, name: "red lentils" },
      { id: 2, name: "chicken breast" },
      { id: 3, name: "turnips" },
      { id: 4, name: "carrots" },
      { id: 5, name: "onion" },
      { id: 6, name: "garlic" } // TRIGGER: SIBO
    ],
    analyzedInstructions: [{
      steps: [
        { step: "Sauté onion, carrots and garlic." },
        { step: "Add lentils and chicken and simmer." }
      ]
    }]
  },
  {
    id: 716406,
    title: "Fresh Asparagus and Pea Soup",
    image: "https://img.spoonacular.com/recipes/716406-556x370.jpg",
    readyInMinutes: 20,
    pricePerServing: 185,
    diets: ["gluten free", "dairy free", "paleolithic"],
    summary: "This fresh, green soup is perfect for a light lunch.",
    extendedIngredients: [
      { id: 1, name: "asparagus" }, // TRIGGER: SIBO
      { id: 2, name: "peas" },
      { id: 3, name: "onion" } // TRIGGER: SIBO
    ],
    analyzedInstructions: [{
      steps: [
        { step: "Chop the onion and asparagus." },
        { step: "Blend everything until smooth." }
      ]
    }]
  },
  {
    id: 644387,
    title: "Garlicky Kale with Olive Oil",
    image: "https://img.spoonacular.com/recipes/644387-556x370.jpg",
    readyInMinutes: 15,
    pricePerServing: 69,
    diets: ["gluten free", "dairy free", "paleolithic"],
    summary: "A simple and delicious side dish.",
    extendedIngredients: [
      { id: 1, name: "kale" },
      { id: 2, name: "garlic" }, // TRIGGER: SIBO
      { id: 3, name: "olive oil" }
    ],
    analyzedInstructions: [{
      steps: [
        { step: "Sauté garlic in olive oil." },
        { step: "Add kale and wilt." }
      ]
    }]
  }
];
