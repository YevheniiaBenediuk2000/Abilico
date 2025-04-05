import MapWrapper from "./components/MapWrapper";

import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p>Click on the map to add a marker for handicapped people.</p>
        <p>U can also click on the marker to make it draggable.</p>
        <MapWrapper />
      </main>
      <footer className={styles.footer}>
        <p>All rights reserved (c)</p>
      </footer>
    </div>
  );
}
