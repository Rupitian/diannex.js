/**
 * Represents all possible instruction operations.
 */
enum Opcode {
    Nop = 0x00, // No-op

    FreeLocal = 0x0A, // Frees a local variable from the stack frame (IF IT EXISTS!): [ID]

    // Special register instructions
    Save = 0x0B, // Copy the value on the top of the stack into the save register
    Load = 0x0C, // Push the value from the save register onto the top of the stack

    // Stack instructions
    PushUndefined = 0x0F, // Push undefined value to stack
    PushInt = 0x10, // Push 32-bit int: [int value]
    PushDouble = 0x11, // Push 64-bit floating point: [double value]

    PushString = 0x12, // Push external string: [index]
    PushInterpolatedString = 0x13, // Push external interpolated string: [index, expr count]
    PushBinaryString = 0x14, // Push internal binary string: [ID]
    PushBinaryInterpolatedString = 0x15, // Push internal binary interpolated string: [ID, expr count]

    MakeArray = 0x16, // Construct an array based off of stack: [size]
    PushArrayIndex = 0x17, // Extract a single value out of an array, removing the array as well (top of stack is index, followed by actual array)
    SetArrayIndex = 0x18, // Sets a value in an array on the top of the stack (top of stack is value, followed by index, followed by actual array)

    SetVarGlobal = 0x19, // Set a global variable from the stack: [string name]
    SetVarLocal = 0x1A, // Set a local variable from the stack: [ID]
    PushVarGlobal = 0x1B, // Pushes a global variable to the stack: [string name]
    PushVarLocal = 0x1C, // Pushes a local variable to the stack: [ID] (if it doesn't exist, error)

    Pop = 0x1D, // Discards the value on the top of the stack
    Duplicate = 0x1E, // Duplicates the value on the top of the stack
    Duplicate2 = 0x1F, // Duplicates the values on the top two slots of the stack

    // Operators
    Add = 0x20, // Adds the two values on the top of the stack, popping them, pushing the result
    Subtract = 0x21, // ditto, subtracts
    Multiply = 0x22, // ditto, multiplies
    Divide = 0x23, // ditto, divides
    Modulo = 0x24, // ditto, modulo
    Negate = 0x25, // Negates the value on the top of the stack, popping it, pushing the result
    Invert = 0x26, // ditto, but inverts a boolean

    BitLeftShift = 0x27, // Peforms bitwise left-shift using the top two values of stack, popping them, pushing the result
    BitRightShift = 0x28, // ditto, right-shift
    BitAnd = 0x29, // ditto, and
    BitOr = 0x2A, // ditto, or
    BitExclusiveOr = 0x2B, // ditto, xor
    BitNegate = 0x2C, // ditto, negate (~)

    Power = 0x2D, // Power binary operation using top two values of stack

    CompareEqual = 0x30, // Compares the top two values of stack to check if they are equal, popping them, pushing the result
    CompareGreaterThan = 0x31, // ditto, greater than
    CompareLessThan = 0x32, // ditto, less than
    CompareGreaterThanEqual = 0x33, // ditto, greater than or equal
    CompareLessThanEqual = 0x34, // ditto, less than or equal
    CompareNotEqual = 0x35, // ditto, not equal

    // Control flow
    Jump = 0x40, // Jumps to an instruction [int relative address from end of instruction]
    JumpTruthy = 0x41, // ditto, but if the value on the top of the stack is truthy (which it pops off)
    JumpFalsey = 0x42, // ditto, but if the value on the top of the stack is NOT truthy (which it pops off)
    Exit = 0x43, // Exits the current stack frame
    Return = 0x44, // Exits the current stack frame, returning a value (from the stack, popping it off)
    Call = 0x45, // Calls a function defined in the code [ID, int parameter count] 
    CallExternal = 0x46, // Calls a function defined by a game [string name, int parameter count] 

    ChoiceBegin = 0x47, // Switches to the choice state in the interpreter- no other choices can run and
                        // only one textrun can execute until after choicesel is executed
    ChoiceAdd = 0x48, // Adds a choice, using the stack for the text and the % chance of appearing [int relative jump address from end of instruction]
    ChoiceAddTruthy = 0x49, // ditto, but also if an additional stack value is truthy [int relative jump address from end of instruction]
    ChoiceSelect = 0x4A, // Pauses the interpreter, waiting for user input to select one of the choices, then jumps to one of them, resuming

    ChooseAdd = 0x4B, // Adds a new address to one of the possible next statements, using stack for chances [int relative jump address from end of instruction] (to the current stack frame)
    ChooseAddTruthy = 0x4C, // ditto, but also if an additional stack value is truthy [int relative jump address from end of instruction]
    ChooseSelect = 0x4D, // Jumps to one of the choices, using the addresses and chances/requirement values on the stack

    TextRun = 0x4E, // Pauses the interpreter, running a line of text from the stack
}

export default Opcode;