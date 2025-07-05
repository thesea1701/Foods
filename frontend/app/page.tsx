import { redirect } from 'next/navigation';
import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  redirect('/restaurants');
  return null;
}
