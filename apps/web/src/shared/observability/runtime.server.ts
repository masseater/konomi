import { runner } from "@r_masseater/workers-tracing/effect";
import { Layer } from "effect";

const runRequest = runner(Layer.empty);

export { runRequest };
