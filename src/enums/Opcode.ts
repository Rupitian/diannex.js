/**
 * Represents all possible instruction operations.
 */
enum Opcode {
    /**
     * No Operation. Does nothing.
     */
    Nop = 0x00,

    /**
     * Frees a local variable from the stack frame (IF IT EXISTS!): [ID]
     */
    FreeLocal = 0x0a,

    // Special register instructions
    /**
     * Copy the value on the top of the stack into the save register
     */
    Save = 0x0b,
    /**
     * Push the value from the save register onto the top of the stack
     */
    Load = 0x0c,

    // Stack instructions
    /**
     * Push undefined value to stack
     */
    PushUndefined = 0x0f,
    /**
     * Push 32-bit int: [int value]
     */
    PushInt = 0x10,
    /**
     * Push 64-bit floating point: [double value]
     */
    PushDouble = 0x11,

    /**
     * Push external string: [index]
     */
    PushString = 0x12,
    /**
     * Push external interpolated string: [index, expr count]
     */
    PushInterpolatedString = 0x13,
    /**
     * Push internal binary string: [ID]
     */
    PushBinaryString = 0x14,
    /**
     * Push internal binary interpolated string: [ID, expr count]
     */
    PushBinaryInterpolatedString = 0x15,

    /**
     * Construct an array based off of stack: [size]
     */
    MakeArray = 0x16,
    /**
     * Extract a single value out of an array, removing the array as well (top of stack is index, followed by actual array)
     */
    PushArrayIndex = 0x17,
    /**
     * Sets a value in an array on the top of the stack (top of stack is value, followed by index, followed by actual array)
     */
    SetArrayIndex = 0x18,

    /**
     * Set a global variable from the stack: [string name]
     */
    SetVarGlobal = 0x19,
    /**
     * Set a local variable from the stack: [ID]
     */
    SetVarLocal = 0x1a,
    /**
     * Pushes a global variable to the stack: [string name]
     */
    PushVarGlobal = 0x1b,
    /**
     *  Pushes a local variable to the stack: [ID] (if it doesn't exist, error)
     */
    PushVarLocal = 0x1c,

    /**
     * Discards the value on the top of the stack
     */
    Pop = 0x1d,
    /**
     * Duplicates the value on the top of the stack
     */
    Duplicate = 0x1e,
    /**
     * Duplicates the values on the top two slots of the stack
     */
    Duplicate2 = 0x1f,

    // Operators
    /**
     * Adds the two values on the top of the stack, popping them, pushing the result
     */
    Add = 0x20,
    /**
     * ditto, subtracts
     */
    Subtract = 0x21,
    /**
     * ditto, multiplies
     */
    Multiply = 0x22,
    /**
     * ditto, divides
     */
    Divide = 0x23,
    /**
     * ditto, modulo
     */
    Modulo = 0x24,
    /**
     * Negates the value on the top of the stack, popping it, pushing the result
     */
    Negate = 0x25,
    /**
     * ditto, but inverts a boolean
     */
    Invert = 0x26,

    /**
     *  Peforms bitwise left-shift using the top two values of stack, popping them, pushing the result
     */
    BitLeftShift = 0x27,
    /**
     * ditto, right-shift
     */
    BitRightShift = 0x28,
    /**
     * ditto, and
     */
    BitAnd = 0x29,
    /**
     * ditto, or
     */
    BitOr = 0x2a,
    /**
     * ditto, xor
     */
    BitExclusiveOr = 0x2b,
    /**
     * ditto, negate (~)
     */
    BitNegate = 0x2c,

    /**
     * Power binary operation using top two values of stack
     */
    Power = 0x2d,

    /**
     * Compares the top two values of stack to check if they are equal, popping them, pushing the result
     */
    CompareEqual = 0x30,
    /**
     * ditto, greater than
     */
    CompareGreaterThan = 0x31,
    /**
     * ditto, less than
     */
    CompareLessThan = 0x32,
    /**
     *  ditto, greater than or equal
     */
    CompareGreaterThanEqual = 0x33,
    /**
     * ditto, less than or equal
     */
    CompareLessThanEqual = 0x34,
    /**
     * ditto, not equal
     */
    CompareNotEqual = 0x35,

    // Control flow
    /**
     *  Jumps to an instruction [int relative address from end of instruction]
     */
    Jump = 0x40,
    /**
     * ditto, but if the value on the top of the stack is truthy (which it pops off)
     */
    JumpTruthy = 0x41,
    /**
     * ditto, but if the value on the top of the stack is NOT truthy (which it pops off)
     */
    JumpFalsey = 0x42,
    /**
     * Exits the current stack frame
     */
    Exit = 0x43,
    /**
     * Exits the current stack frame, returning a value (from the stack, popping it off)
     */
    Return = 0x44,
    /**
     * Calls a function defined in the code [ID, int parameter count]
     */
    Call = 0x45,
    /**
     * Calls a function defined by a game [string name, int parameter count]
     */
    CallExternal = 0x46,

    /**
     * Switches to the choice state in the interpreter- no other choices can run and
     * only one textrun can execute until after choicesel is executed
     */
    ChoiceBegin = 0x47,

    /**
     * Adds a choice, using the stack for the text and the % chance of appearing [int relative jump address from end of instruction]
     */
    ChoiceAdd = 0x48,
    /**
     * ditto, but also if an additional stack value is truthy [int relative jump address from end of instruction]
     */
    ChoiceAddTruthy = 0x49,
    /**
     * Pauses the interpreter, waiting for user input to select one of the choices, then jumps to one of them, resuming
     */
    ChoiceSelect = 0x4a,

    /**
     * Adds a new address to one of the possible next statements, using stack for chances [int relative jump address from end of instruction] (to the current stack frame)
     */
    ChooseAdd = 0x4b,
    /**
     * ditto, but also if an additional stack value is truthy [int relative jump address from end of instruction]
     */
    ChooseAddTruthy = 0x4c,
    /**
     * Jumps to one of the choices, using the addresses and chances/requirement values on the stack
     */
    ChooseSelect = 0x4d,

    /**
     * Pauses the interpreter, running a line of text from the stack
     */
    TextRun = 0x4e,
}

export default Opcode;
