export function at<T>(arr: T[], index: number): T {
  const item = arr[index];
  if (item === undefined) {
    throw new Error(`Expected item at index ${index}, but array length is ${arr.length}`);
  }
  return item;
}
