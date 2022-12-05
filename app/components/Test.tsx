import styles from "./test.css"

export const links = () => [{
    rel: "stylesheet", href: styles
}];

export const Test = () => {
    return <><span className="test"> Hellopp </span> <button onClick={() => { alert("Hi") }}>Click me</button></>
}

