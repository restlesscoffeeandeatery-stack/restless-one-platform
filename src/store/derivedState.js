export const getPreparationCost = (prep, materials, preparations) => {
  if (!prep) return 0;
  if (!prep.ingredients || !prep.ingredients.length) return Number(prep.hppTotal || 0);

  const totalCost = prep.ingredients.reduce((acc, ing) => {
    if (ing.type === 'RAW_MATERIAL') {
      const mat = materials.find(m => m.id === ing.id);
      if (mat) {
        // Simple cost based on latestPrice (assuming the quantity units match the latestPrice units for simplicity in this prototype)
        return acc + (mat.latestPrice * ing.quantity);
      }
    } else if (ing.type === 'PREPARATION') {
      const subPrep = preparations.find(p => p.id === ing.id);
      if (subPrep) {
        const subCostPerUnit = getPreparationCost(subPrep, materials, preparations) / subPrep.yield;
        return acc + (subCostPerUnit * ing.quantity);
      }
    }
    return acc;
  }, 0);

  return totalCost;
};

export const getRecipeHPP = (recipe, materials, preparations) => {
  if (!recipe) return 0;
  if (!recipe.ingredients || !recipe.ingredients.length) return Number(recipe.hppTotal || 0);

  const hpp = recipe.ingredients.reduce((acc, ing) => {
    if (ing.type === 'RAW_MATERIAL') {
      const mat = materials.find(m => m.id === ing.id);
      if (mat) {
        return acc + (mat.latestPrice * ing.quantity);
      }
    } else if (ing.type === 'PREPARATION') {
      const prep = preparations.find(p => p.id === ing.id);
      if (prep) {
        const costPerUnit = getPreparationCost(prep, materials, preparations) / prep.yield;
        return acc + (costPerUnit * ing.quantity);
      }
    }
    return acc;
  }, 0);

  return hpp;
};
