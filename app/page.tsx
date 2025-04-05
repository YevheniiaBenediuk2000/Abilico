import MapWrapper from "./components/MapWrapper";

import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <MapWrapper />
      </main>
      <footer className={styles.footer}></footer>
    </div>
  );
}
