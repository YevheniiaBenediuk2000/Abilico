import MapWrapper from "./components/MapWrapper";

import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p>Click on the map to add a marker for handicapped people.</p>
        <p>U can also click on the marker to make it draggable.</p>
      </header>
      <main className={styles.main}>
        <MapWrapper />
      </main>
      <footer></footer>
    </div>
  );
}
