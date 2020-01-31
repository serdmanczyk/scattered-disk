package main

// copy a<-b, accomodating for when maps are nil.
func addHeaders(a, b map[string]string) map[string]string {
	if b == nil {
		return a
	}
	if a == nil {
		return b
	}
	for k, v := range b {
		a[k] = v
	}

	return a
}
