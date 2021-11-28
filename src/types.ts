/**
 *
 */
type Definition = {
    symbol: number;
    reference: number;
    instructionIndex: number;
};

export { Definition };

/**
 * Represents all possible value types.
 */
type Value = undefined | string | number | Value[];

export { Value };

/**
 * A method used to randomly decide if a Choice/Choose option will be displayed.
 *
 * @param chance The normalized chance of being displayed. By default it's 1 if no chances were declared.
 * @return Whether or not the Choice/Choose option should be displayed.
 */
type ChanceHandler = (chance: number) => boolean;
/**
 * A method used to randomly pick a Choose option.
 *
 * @param weights A list of normalized weights for each Choose option. By default a weight is 1 if no weight was specified for that specific Choose option.
 * @return Which Choose option to select.
 */
type WeightedChanceHandler = (chance: number[]) => number;

export {
    ChanceHandler, WeightedChanceHandler 
};

/**
 * Represents a Diannex function.
 *
 * @param args The arguments to be passed to the function.
 * @returns The result of the function.
 */
type DiannexFunc = (args: Value[]) => Value;

export { DiannexFunc };
