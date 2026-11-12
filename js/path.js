/* =========================================================
   PATH — the analytic canyon road
   The world moves along +s. World forward is -Z.
   ========================================================= */

const GamePath = (() => {
  const A1 = 15.5;
  const W1 = 0.0105;
  const A2 = 6.5;
  const W2 = 0.0275;
  const P2 = 2.35;

  // Keep the starting point centered on the world origin.
  const OFFSET = -(A1 * Math.sin(0) + A2 * Math.sin(P2));

  function cx(s) {
    return A1 * Math.sin(s * W1) + A2 * Math.sin(s * W2 + P2) + OFFSET;
  }

  function slope(s) {
    return A1 * W1 * Math.cos(s * W1) + A2 * W2 * Math.cos(s * W2 + P2);
  }

  /**
   * Convert track coordinates (distance, lateral offset, height) to world space.
   * lateral > 0 = right side of the road.
   */
  function point(s, lateral = 0, y = 0, target) {
    const dx = slope(s);
    const inv = 1 / Math.sqrt(dx * dx + 1);
    const rightX = inv;
    const rightZ = dx * inv;
    const x = cx(s) + lateral * rightX;
    const z = -s + lateral * rightZ;
    if (target) {
      target.set(x, y, z);
      return target;
    }
    return new THREE.Vector3(x, y, z);
  }

  /** Rotation around Y that makes an object face down the track. */
  function heading(s) {
    return Math.atan2(-slope(s), 1);
  }

  /** Right-hand lateral vector in world space. */
  function right(s, target) {
    const dx = slope(s);
    const inv = 1 / Math.sqrt(dx * dx + 1);
    if (target) {
      target.set(inv, 0, dx * inv);
      return target;
    }
    return new THREE.Vector3(inv, 0, dx * inv);
  }

  /** Unit forward tangent in world space. */
  function forward(s, target) {
    const dx = slope(s);
    const inv = 1 / Math.sqrt(dx * dx + 1);
    if (target) {
      target.set(dx * inv, 0, -inv);
      return target;
    }
    return new THREE.Vector3(dx * inv, 0, -inv);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  return { cx, slope, point, heading, right, forward, lerp, clamp };
})();
