export class AttributeConfig {
  //Indicates that a file holds the profile definition for this drive
  static readonly AttributeFileType: number = 77;
}

export function sortByPriority(a: { priority: number }, b: { priority: number }) {
  return a.priority - b.priority;
}
