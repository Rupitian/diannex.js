# Diannex.js
Diannex.js is a JavaScript Bytecode Interpreter for the Diannex dialogue language (the compiler of which can be found [here](https://github.com/Rupitian/diannex)). It's meant for use in games, but it can also be used in other applications or websites, if so desired. Diannex.js includes TypeScript definitions. This is, essentially, a direct port of the C# Bytecode Interpreter, which can be found [here](https://github.com/Rupitian/Diannex.Net).

## Usage
Since it's meant to be made with games, which could have very different control flow, usage of the library will be different from project to project.
In general however, there are 4 steps which must be followed.
1. You need to construct an `Interpreter`, which takes in a `Binary` and a [`FunctionHandler`](#using-the-functionhandler) (and optionally a `Choice/WeightedChoiceHandler`).
2. You must run a scene with `Interpreter.runScene(string)`, which takes in the name of a scene preceded by any namespaces (e.g. `main.scene1`).
3. You must run `Interpreter.update()` ever frame/tick of your engine to progress the `Interpreter`.
4. Whenever [`Interpreter.runningText`](#handling-interpreterrunningtext) or [`Interpreter.selectChoice`](#handling-interpreterselectchoice) is true, you must handle them then run `Interpreter.resume()` when finished to continue progressing the `Interpreter`.

## Using the FunctionHandler
The `FunctionHandler` class is how you will get your Diannex code to execute methods inside of your Engine/Application. This is done through the `FunctionHandler.registerFunction()` method.

This method takes in a `string` and a function with the signature `(Value[]) => Value`.
The `string` is the name of the method in your Diannex script, and the function is just the function you want to map to that name.

Here's an example of how to use the `FunctionHandler`:
```typescript
import { FunctionHandler } from "diannex";
import type { Value } from "diannex";

const totallyNotAdding = (args: Value[]): Value => {
  if (args.length !== 2 || typeof args[0] !== "number" || typeof args[1] !== "number") {
    // Log your error, or throw an exception if you wish, I'll just return 0.
    return 0;
  }
  
  return args[0] + args[1];
}

// Somewhere in your Engine/Application's init
const fh = new FunctionHandler();
fh.registerFunction("totallyNotAdding", totallyNotAdding);
```
Note that the function `totallyNotAdding` manually checks if the arguments are valid, and if not, it returns 0. This should always be done, as it's the only way to ensure that the function is called with the correct arguments.

## Handling Interpreter.runningText
When the `Interpreter` is ready to display dialogue to the user, it will set `Interpreter.runningText` to true, and will pause execution of the bytecode. 
The text to be displayed is located in `Interpreter.currentText`.
How you display this text is ultimately up to you, but typically this would be something like showing a dialogue box in your engine.

When you're done displaying the dialogue (in the example given above, this would be when your user presses a key to continue), you can resume the Interpreter by running `Interpreter.resume()`

## Handling Interpreter.selectChoice
Whenever the `Interpreter` comes across a point in your Diannex script where multiple choices are presented, it will set `Interpreter.selectChoice` to true, and pause execution of the bytecode.
The choices are located in `Interpreter.choices`, which is a `string[]`.
Just like with displaying text, how you handle choices is ultimately up to you, but however you handle it, you must run `Interpreter.chooseChoice(number)`.

`Interpreter.chooseChoice(number)` takes in a `number`, which is an index within the `Interpreter.choices` list chosen by the user.
When you run this method, the Interpreter will automatically `resume()`, so you won't have to.


## Samples
As mentioned before, since this library is meant to be used in games, the control flow for your dialogue is likely to be different.
As such there isn't a quick sample I can place here aside from follow the steps outlined in (Usage)[#usage].

Eventually a full sample application will be made, at which point I'll replace this section with the link to it.
For now however, you can follow the [Issue](https://github.com/Rupitian/Diannex.Net/issues/1) about it.
