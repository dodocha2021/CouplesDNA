// This is a placeholder for the MultiSelect component.
// A full implementation is required for file selection in Report Mode.
// You can use a library like `react-select` or build a custom one.

import React from 'react';

const MultiSelect = ({ options, value, onChange, placeholder }) => {
  // A very basic multi-select representation
  return (
    <div className="p-2 border rounded-md bg-gray-100 text-gray-500">
      <p className="text-sm">[MultiSelect Component Placeholder]</p>
      <p className="text-xs">Selected: {value.length} of {options.length}</p>
      <p className="text-xs">To be implemented.</p>
    </div>
  );
};

export default MultiSelect;
