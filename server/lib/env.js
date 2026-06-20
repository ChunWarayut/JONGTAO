// This module MUST be the first import in the application entry point.
// ES module imports are hoisted, but modules are evaluated in dependency
// order.  By putting dotenv.config() in its own module and importing it
// before anything else in index.js, we guarantee process.env is populated
// before any other module reads it at evaluation time.
import dotenv from 'dotenv'
dotenv.config()
