// ── Semilla de Datos de Grado Médico (Desarrollo) ──────────────────
// Estos datos simulan una respuesta de la API interna para desarrollo offline.

export const MOCK_RECIPE_DATA = [
  {
    id: "715415",
    title: "Red Lentil Soup with Chicken and Turnips",
    imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&q=80&w=556&h=370",
    prepTimeMinutes: 55,
    estimatedCost: 3,
    siboAllergiesTags: ["gluten free", "dairy free"],
    summary: "A hearty and nutritious soup with lentils, chicken, and fresh vegetables.",
    ingredients: [
      { id: "1", name: "red lentils" },
      { id: "2", name: "chicken breast" },
      { id: "3", name: "turnips" },
      { id: "4", name: "carrots" },
      { id: "5", name: "onion" },
      { id: "6", name: "garlic" }
    ],
    instructions: [
      "Sauté onion, carrots and garlic.",
      "Add lentils and chicken and simmer."
    ]
  },
  {
    id: "716406",
    title: "Fresh Asparagus and Pea Soup",
    imageUrl: "https://images.unsplash.com/photo-1548943487-a2e4f43b4850?auto=format&fit=crop&q=80&w=556&h=370",
    prepTimeMinutes: 20,
    estimatedCost: 2,
    siboAllergiesTags: ["gluten free", "dairy free", "paleolithic"],
    summary: "This fresh, green soup is perfect for a light lunch.",
    ingredients: [
      { id: "1", name: "asparagus" },
      { id: "2", name: "peas" },
      { id: "3", name: "onion" }
    ],
    instructions: [
      "Chop the onion and asparagus.",
      "Blend everything until smooth."
    ]
  },
  {
    id: "644387",
    title: "Garlicky Kale with Olive Oil",
    imageUrl: "https://images.unsplash.com/photo-1528659556157-122e26090c2a?auto=format&fit=crop&q=80&w=556&h=370",
    prepTimeMinutes: 15,
    estimatedCost: 1,
    siboAllergiesTags: ["gluten free", "dairy free", "paleolithic"],
    summary: "A simple and delicious side dish.",
    ingredients: [
      { id: "1", name: "kale" },
      { id: "2", name: "garlic" },
      { id: "3", name: "olive oil" }
    ],
    instructions: [
      "Sauté garlic in olive oil.",
      "Add kale and wilt."
    ]
  }
];
