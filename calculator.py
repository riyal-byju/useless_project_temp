import random

def evaluate(expression):
    try:
        # Safe evaluation of simple math
        return eval(expression, {"__builtins__": {}}, {})
    except Exception:
        return None

def make_useless_explanation(result):
    """Generate a pointless way to express the number"""
    if not isinstance(result, (int, float)):
        return f"Somehow the universe decided the answer is {result}"

    # Convert float that is actually integer
    if isinstance(result, float) and result.is_integer():
        result = int(result)

    templates = [
        f"{result * 2} divided by 2 is {result}",
        f"{result * 3} divided by 3 is {result}",
        f"{result + 5} minus 5 is {result}",
        f"{result - 7} plus 7 is {result}",
        f"{result * 4} divided by 4 is {result}",
        f"The square root of {result ** 2} is {result}",
        f"{result} plus 0 is still {result} (shocking, I know)",
        f"If you take {result * 10} and remove a zero, you get {result}",
        f"{result} multiplied by 1 is mysteriously still {result}",
        f"Half of {result * 2} turns out to be {result}",
    ]

    # Extra silly ones for small integers
    if isinstance(result, int) and 0 <= result <= 20:
        templates.extend([
            f"The number of fingers you need to show {result} is... {result}",
            f"If you count from 1 to {result}, you end up at {result}",
            f"Adding {result} zeros to the number 1 gives you a very long number, but we only needed {result}",
        ])

    return random.choice(templates)

def useless_calculator():
    print("=" * 50)
    print("      ★  THE USELESS CALCULATOR  ★")
    print("=" * 50)
    print("I will give you the correct answer...")
    print("...but in the most pointless way possible.\n")

    while True:
        expr = input("Enter expression (or 'quit' to exit): ").strip()
        if expr.lower() in ("quit", "exit", "q"):
            print("\nGoodbye. May your math forever be unnecessarily complicated.")
            break

        if not expr:
            continue

        result = evaluate(expr)
        if result is None:
            print("I can't even pretend to understand that. Try something simpler like 2+2\n")
            continue

        explanation = make_useless_explanation(result)
        print(f"\n→ {expr} = {result}")
        print(f"  ...which means: {explanation}\n")
        print("-" * 50)

if __name__ == "__main__":
    useless_calculator()
