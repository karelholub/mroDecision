const tokenPattern = /\s*(=>|==|!=|>=|<=|\bin\b|\btrue\b|\bfalse\b|\bnull\b|[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|&&|\|\||[()[\],+\-*/<>!])\s*/gy;

export function evaluateExpression(source, env) {
  const parser = new Parser(tokenize(source), env);
  const value = parser.parseExpression();
  parser.expectEnd();
  return value;
}

function tokenize(source) {
  const tokens = [];
  tokenPattern.lastIndex = 0;
  while (tokenPattern.lastIndex < source.length) {
    const previous = tokenPattern.lastIndex;
    const match = tokenPattern.exec(source);
    if (!match || match.index !== previous) {
      throw new Error(`Unexpected token near: ${source.slice(previous, previous + 20)}`);
    }
    tokens.push(match[1]);
  }
  return tokens;
}

class Parser {
  constructor(tokens, env) {
    this.tokens = tokens;
    this.env = env;
    this.position = 0;
  }

  parseExpression() {
    return this.parseOr();
  }

  parseOr() {
    let left = this.parseAnd();
    while (this.match("||")) left = Boolean(left) || Boolean(this.parseAnd());
    return left;
  }

  parseAnd() {
    let left = this.parseEquality();
    while (this.match("&&")) left = Boolean(left) && Boolean(this.parseEquality());
    return left;
  }

  parseEquality() {
    let left = this.parseComparison();
    while (true) {
      if (this.match("==")) left = compareValues(left, this.parseComparison()) === 0;
      else if (this.match("!=")) left = compareValues(left, this.parseComparison()) !== 0;
      else return left;
    }
  }

  parseComparison() {
    let left = this.parseTerm();
    while (true) {
      if (this.match(">=")) left = compareValues(left, this.parseTerm()) >= 0;
      else if (this.match("<=")) left = compareValues(left, this.parseTerm()) <= 0;
      else if (this.match(">")) left = compareValues(left, this.parseTerm()) > 0;
      else if (this.match("<")) left = compareValues(left, this.parseTerm()) < 0;
      else if (this.match("in")) {
        const right = this.parseTerm();
        left = Array.isArray(right) && right.includes(left);
      } else return left;
    }
  }

  parseTerm() {
    let left = this.parseFactor();
    while (true) {
      if (this.match("+")) left = Number(left) + Number(this.parseFactor());
      else if (this.match("-")) left = Number(left) - Number(this.parseFactor());
      else return left;
    }
  }

  parseFactor() {
    let left = this.parseUnary();
    while (true) {
      if (this.match("*")) left = Number(left) * Number(this.parseUnary());
      else if (this.match("/")) left = Number(left) / Number(this.parseUnary());
      else return left;
    }
  }

  parseUnary() {
    if (this.match("!")) return !Boolean(this.parseUnary());
    if (this.match("-")) return -Number(this.parseUnary());
    return this.parsePrimary();
  }

  parsePrimary() {
    const token = this.advance();
    if (token == null) throw new Error("Unexpected end of expression");
    if (token === "(") {
      const value = this.parseExpression();
      this.expect(")");
      return value;
    }
    if (token === "[") return this.parseArray();
    if (token === "true") return true;
    if (token === "false") return false;
    if (token === "null") return null;
    if (/^\d/.test(token)) return Number(token);
    if (/^["']/.test(token)) return JSON.parse(token[0] === "'" ? `"${token.slice(1, -1).replaceAll('"', '\\"')}"` : token);
    if (/^[A-Za-z_]/.test(token)) {
      if (this.match("(")) return this.callFunction(token);
      throw new Error(`Unknown identifier: ${token}`);
    }
    throw new Error(`Unexpected token: ${token}`);
  }

  parseArray() {
    const values = [];
    if (this.match("]")) return values;
    do {
      values.push(this.parseExpression());
    } while (this.match(","));
    this.expect("]");
    return values;
  }

  callFunction(name) {
    const args = [];
    if (!this.match(")")) {
      do {
        args.push(this.parseExpression());
      } while (this.match(","));
      this.expect(")");
    }
    return callAllowedFunction(name, args, this.env);
  }

  match(token) {
    if (this.peek() !== token) return false;
    this.position += 1;
    return true;
  }

  expect(token) {
    if (!this.match(token)) throw new Error(`Expected ${token}`);
  }

  expectEnd() {
    if (this.peek() != null) throw new Error(`Unexpected token: ${this.peek()}`);
  }

  advance() {
    return this.tokens[this.position++];
  }

  peek() {
    return this.tokens[this.position];
  }
}

function callAllowedFunction(name, args, env) {
  if (name === "attribute") return env.attribute(String(args[0]));
  if (name === "segment") return env.segment(String(args[0]));
  if (name === "context") return env.context(String(args[0]));
  if (name === "score") return env.score(String(args[0]));
  if (name === "days_since") return daysSince(args[0], env.now);
  if (name === "lookup") return env.lookup(String(args[0]), args[1], args[2] == null ? undefined : String(args[2]));
  throw new Error(`Unsupported function: ${name}`);
}

function daysSince(value, now) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return Math.floor((now.getTime() - timestamp) / 86400000);
}

function compareValues(left, right) {
  if (left == null && right == null) return 0;
  if (left == null) return -1;
  if (right == null) return 1;
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) return leftNumber - rightNumber;
  return String(left).localeCompare(String(right));
}
