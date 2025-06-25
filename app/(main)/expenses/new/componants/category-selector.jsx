"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React, { useEffect, useState } from "react";

const CategorySelector = ({ categories, onChange }) => {
  const [selectedCategory, setSelectedCategory] = useState("");

  //handle when a category is selected
  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);

    //only call onChange if it exists and the value has changed
    if (onChange && categoryId !== selectedCategory) {
      onChange(categoryId);
    }
  };

  //if no categories or empty categories array
  if (!categories || categories.length === 0) {
    return <div>No categories available</div>;
  }

  useEffect(() => {
    //set default value if not already set
    if (!selectedCategory && categories.length > 0) {
      //find default category or use the first one
      const defaultCategory =
        categories.find((cat) => cat.isDefault) || categories[0];

      //set default w/o trigging re-render loop
      setTimeout(() => {
        setSelectedCategory(defaultCategory.id);
        if (onChange) {
          onChange(defaultCategory.id);
        }
      }, 0);
    }
  }, []);

  return (
    <Select value={selectedCategory} onValueChange={handleCategoryChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a category" />
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            <div className="flex items-center gap-2">
              <span>{category.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CategorySelector;
