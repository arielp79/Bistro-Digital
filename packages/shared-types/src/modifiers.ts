export interface ModifierSelection {
  groupId: string;
  optionId: string;
}

export interface ModifierGroupLike {
  groupId: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
}

export function validateModifiers(
  groups: ModifierGroupLike[],
  selected: ModifierSelection[]
): boolean {
  return groups.every((group) => {
    const groupSelected = selected.filter((s) => s.groupId === group.groupId);
    if (group.required && groupSelected.length < group.minSelections) return false;
    if (groupSelected.length > group.maxSelections) return false;
    return true;
  });
}
