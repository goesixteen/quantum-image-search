/* Copyright 2016 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

/* Modified 2026 for the QNN playground: image-search scenes replace the 2-D datasets and
   input features; 'activation' replaced by 'entangler'; adds readout, shots, reupload,
   threshold, grid, target and probe; removes regression, regularization, initZero,
   tutorial and collectStats. See ../NOTICE. */

import * as nn from "./qnn";

/** Suffix added to the state when storing if a control is hidden or not. */
const HIDE_STATE_SUFFIX = "_hide";

/** A map between names and entangling layouts (QNN: replaces activations). */
export let entanglers: {[key: string]: nn.Entangler} = {
  "cnot": "cnot",
  "cry": "cry",
  "none": "none"
};

/** Readouts: the demos' hybrid sigmoid over 7 observables, or pure <Z0>. */
export let readouts: {[key: string]: nn.Readout} = {
  "project": "project",
  "z0": "z0"
};

export function getKeyFromValue(obj: any, value: any): string {
  for (let key in obj) {
    if (obj[key] === value) {
      return key;
    }
  }
  return undefined;
}

function endsWith(s: string, suffix: string): boolean {
  return s.substr(-suffix.length) === suffix;
}

function getHideProps(obj: any): string[] {
  let result: string[] = [];
  for (let prop in obj) {
    if (endsWith(prop, HIDE_STATE_SUFFIX)) {
      result.push(prop);
    }
  }
  return result;
}

/**
 * The data type of a state variable. Used for determining the
 * (de)serialization method.
 */
export enum Type {
  STRING,
  NUMBER,
  ARRAY_NUMBER,
  ARRAY_STRING,
  BOOLEAN,
  OBJECT
}

export interface Property {
  name: string;
  type: Type;
  keyMap?: {[key: string]: any};
};

// Add the GUI state.
export class State {

  private static PROPS: Property[] = [
    {name: "mode", type: Type.STRING},
    {name: "grid", type: Type.NUMBER},
    {name: "target", type: Type.NUMBER},
    {name: "jitterX", type: Type.NUMBER},
    {name: "jitterY", type: Type.NUMBER},
    {name: "probe", type: Type.NUMBER},
    {name: "background", type: Type.STRING},
    {name: "height", type: Type.NUMBER},
    {name: "threshold", type: Type.NUMBER},
    {name: "off", type: Type.ARRAY_STRING},
    {name: "entangler", type: Type.OBJECT, keyMap: entanglers},
    {name: "readout", type: Type.OBJECT, keyMap: readouts},
    {name: "batchSize", type: Type.NUMBER},
    {name: "learningRate", type: Type.NUMBER},
    {name: "noise", type: Type.NUMBER},
    {name: "networkShape", type: Type.ARRAY_NUMBER},
    {name: "seed", type: Type.STRING},
    {name: "discretize", type: Type.BOOLEAN},
    {name: "percTrainData", type: Type.NUMBER},
    {name: "hideText", type: Type.BOOLEAN},
    {name: "shots", type: Type.NUMBER},
    {name: "reupload", type: Type.BOOLEAN}
  ];

  [key: string]: any;
  /** "guided" (simple, step by step) or "explorer" (every detail). */
  mode = "guided";
  /** Regions per side of the address grid (null = the scene's default). */
  grid: number = null;
  /** Region holding the target; -1 = removed (null = the site's default). */
  target: number = null;
  /** Target offset from its region's centre, in region widths (-0.4..0.4). */
  jitterX = 0;
  jitterY = 0;
  /** Region whose classifier state the quantum views show. */
  probe: number = null;
  /** Wanda scene: catalog background id and supplied target height (px). */
  background: string = null;
  height: number = null;
  /**
   * Score at or above which a region is marked for the Grover oracle
   * (null = the site model's threshold).
   */
  threshold: number = null;
  /** Feature names switched off (their encoding angle becomes 0). */
  off: string[] = [];
  learningRate = 0.1;
  noise = 0;
  batchSize = 10;
  discretize = false;
  percTrainData = 50;
  entangler: nn.Entangler = "cnot";
  readout: nn.Readout = "project";
  /** Measurement shots per estimate; 0 means exact expectation values. */
  shots = 0;
  /** Re-encode the input features in every layer, not just the first. */
  reupload = true;
  hideText = false;
  numHiddenLayers = 4;
  hiddenLayerControls: any[] = [];
  /** One entry per gate layer (all the same qubit count; 4 as in the demos). */
  networkShape: number[] = [4, 4, 4, 4];
  seed: string;

  /**
   * Deserializes the state from the url hash.
   */
  static deserializeState(): State {
    let map: {[key: string]: string} = {};
    for (let keyvalue of window.location.hash.slice(1).split("&")) {
      let [name, value] = keyvalue.split("=");
      map[name] = value;
    }
    let state = new State();

    function hasKey(name: string): boolean {
      return name in map && map[name] != null && map[name].trim() !== "";
    }

    function parseArray(value: string): string[] {
      return value.trim() === "" ? [] : value.split(",");
    }

    // Deserialize regular properties.
    State.PROPS.forEach(({name, type, keyMap}) => {
      switch (type) {
        case Type.OBJECT:
          if (keyMap == null) {
            throw Error("A key-value map must be provided for state " +
                "variables of type Object");
          }
          if (hasKey(name) && map[name] in keyMap) {
            state[name] = keyMap[map[name]];
          }
          break;
        case Type.NUMBER:
          if (hasKey(name)) {
            // The + operator is for converting a string to a number.
            state[name] = +map[name];
          }
          break;
        case Type.STRING:
          if (hasKey(name)) {
            state[name] = map[name];
          }
          break;
        case Type.BOOLEAN:
          if (hasKey(name)) {
            state[name] = (map[name] === "false" ? false : true);
          }
          break;
        case Type.ARRAY_NUMBER:
          if (name in map) {
            state[name] = parseArray(map[name]).map(Number);
          }
          break;
        case Type.ARRAY_STRING:
          if (name in map) {
            state[name] = parseArray(map[name]);
          }
          break;
        default:
          throw Error("Encountered an unknown type for a state variable");
      }
    });

    // Deserialize state properties that correspond to hiding UI controls.
    getHideProps(map).forEach(prop => {
      state[prop] = (map[prop] === "true") ? true : false;
    });
    state.numHiddenLayers = state.networkShape.length;
    if (state.seed == null) {
      state.seed = Math.random().toFixed(5);
    }
    Math.seedrandom(state.seed);
    return state;
  }

  /**
   * Serializes the state into the url hash.
   */
  /** `replace` updates the URL without a new history entry (for drags). */
  serialize(replace = false) {
    // Serialize regular properties.
    let props: string[] = [];
    State.PROPS.forEach(({name, type, keyMap}) => {
      let value = this[name];
      // Don't serialize missing values.
      if (value == null) {
        return;
      }
      if (type === Type.OBJECT) {
        value = getKeyFromValue(keyMap, value);
      } else if (type === Type.ARRAY_NUMBER ||
          type === Type.ARRAY_STRING) {
        value = value.join(",");
      }
      props.push(`${name}=${value}`);
    });
    // Serialize properties that correspond to hiding UI controls.
    getHideProps(this).forEach(prop => {
      props.push(`${prop}=${this[prop]}`);
    });
    if (replace) {
      window.history.replaceState(null, "", "#" + props.join("&"));
    } else {
      window.location.hash = props.join("&");
    }
  }

  /** Returns all the hidden properties. */
  getHiddenProps(): string[] {
    let result: string[] = [];
    for (let prop in this) {
      if (endsWith(prop, HIDE_STATE_SUFFIX) && String(this[prop]) === "true") {
        result.push(prop.replace(HIDE_STATE_SUFFIX, ""));
      }
    }
    return result;
  }

  setHideProperty(name: string, hidden: boolean) {
    this[name + HIDE_STATE_SUFFIX] = hidden;
  }
}
