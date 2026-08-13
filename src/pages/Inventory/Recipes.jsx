import React from 'react';
import { useStore } from '../../store/useStore';
import { formatRupiah, formatPercentage } from '../../utils/format';
import { Plus } from 'lucide-react';
import { getRecipeHPP } from '../../store/derivedState';

const Recipes = () => {
  const recipes = useStore(state => state.recipes);
  const materials = useStore(state => state.materials);
  const preparations = useStore(state => state.preparations);

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title" style={{ margin: 0 }}>Recipes / Menu</h1>
        <button className="btn btn-primary">
          <Plus size={16} className="mr-2" style={{ marginRight: '0.5rem' }} />
          Create Recipe
        </button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Menu Name</th>
                <th>Category</th>
                <th>Selling Price</th>
                <th>Dynamic HPP</th>
                <th>Food Cost %</th>
                <th>Gross Margin %</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recipes.map(recipe => {
                const hpp = getRecipeHPP(recipe, materials, preparations);
                const foodCostPerc = (hpp / recipe.sellingPrice) * 100;
                const marginPerc = ((recipe.sellingPrice - hpp) / recipe.sellingPrice) * 100;

                return (
                  <tr key={recipe.id}>
                    <td className="font-medium">{recipe.name}</td>
                    <td>{recipe.category}</td>
                    <td className="font-semibold">{formatRupiah(recipe.sellingPrice)}</td>
                    <td className="font-semibold text-primary">{formatRupiah(hpp)}</td>
                    <td>
                      <span className={`badge ${foodCostPerc > 40 ? 'badge-danger' : 'badge-success'}`}>
                        {formatPercentage(foodCostPerc)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${marginPerc < 60 ? 'badge-warning' : 'badge-success'}`}>
                        {formatPercentage(marginPerc)}
                      </span>
                    </td>
                    <td>
                      <a href="#" style={{ color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 500 }}>View Details</a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Recipes;
