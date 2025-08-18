pub fn hello_core() -> &'static str {
    "littlefaith"
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn it_works() {
        assert_eq!(hello_core(), "littlefaith");
    }
}
